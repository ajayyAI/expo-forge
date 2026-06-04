/**
 * App Attest persistence: challenge nonces and verified device keys.
 *
 * All functions here are internal — the public transport lives in
 * appAttest.ts (a "use node" module). Splitting the DB layer out keeps the
 * crypto verifier in the Node runtime while these mutations/queries run in the
 * default Convex runtime and stay unit-testable under the edge-runtime harness.
 */

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { rateLimitWithThrow } from "./rateLimit";

const environmentValidator = v.union(
  v.literal("development"),
  v.literal("production")
);

/** Persist a freshly issued challenge nonce. Single-use, TTL'd. */
export const createChallenge = internalMutation({
  args: { nonce: v.string(), expiresAt: v.number() },
  returns: v.id("appAttestChallenges"),
  handler: async (ctx, args): Promise<Id<"appAttestChallenges">> => {
    // Global (no key) cap on challenge issuance — bounds the unauthenticated
    // requestChallenge surface regardless of how the action is invoked.
    await rateLimitWithThrow(ctx, "appAttestChallenge");
    return await ctx.db.insert("appAttestChallenges", {
      nonce: args.nonce,
      expiresAt: args.expiresAt,
      used: false,
    });
  },
});

/**
 * Atomically consume a challenge. Returns false if the nonce is unknown,
 * already used, or expired; otherwise marks it used and returns true.
 *
 * The lookup, the checks, and the `used` patch all run in one mutation
 * transaction: the `.unique()` read on `by_nonce` establishes a read
 * dependency on that row, so two concurrent consumers of the same nonce
 * conflict under OCC and one retries — only one can ever observe `used:
 * false` and flip it. This is the core single-use / anti-replay guarantee.
 */
export const consumeChallenge = internalMutation({
  args: { nonce: v.string(), now: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    const row = await ctx.db
      .query("appAttestChallenges")
      .withIndex("by_nonce", (q) => q.eq("nonce", args.nonce))
      .unique();

    if (!row || row.used || row.expiresAt < args.now) {
      return false;
    }

    await ctx.db.patch(row._id, { used: true });
    return true;
  },
});

/**
 * Upsert a verified key keyed on `keyId`. Re-attesting an existing key resets
 * `counter` to 0 (Apple emits attestations with signCount 0) and refreshes the
 * public key / environment; a userId is only applied when newly supplied, so a
 * later anonymous re-attest never unbinds an existing user.
 */
export const storeKey = internalMutation({
  args: {
    keyId: v.string(),
    publicKey: v.string(),
    environment: environmentValidator,
    userId: v.optional(v.id("users")),
    now: v.number(),
  },
  returns: v.id("appAttestKeys"),
  handler: async (ctx, args): Promise<Id<"appAttestKeys">> => {
    const existing = await ctx.db
      .query("appAttestKeys")
      .withIndex("by_keyId", (q) => q.eq("keyId", args.keyId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        publicKey: args.publicKey,
        environment: args.environment,
        userId: args.userId ?? existing.userId,
        counter: 0,
        attestedAt: args.now,
      });
      return existing._id;
    }

    return await ctx.db.insert("appAttestKeys", {
      keyId: args.keyId,
      publicKey: args.publicKey,
      environment: args.environment,
      userId: args.userId,
      counter: 0,
      attestedAt: args.now,
    });
  },
});

export const findKey = internalQuery({
  args: { keyId: v.string() },
  returns: v.union(
    v.object({
      keyId: v.string(),
      publicKey: v.string(),
      counter: v.number(),
      environment: environmentValidator,
      userId: v.optional(v.id("users")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("appAttestKeys")
      .withIndex("by_keyId", (q) => q.eq("keyId", args.keyId))
      .unique();

    if (!row) {
      return null;
    }
    return {
      keyId: row.keyId,
      publicKey: row.publicKey,
      counter: row.counter,
      environment: row.environment,
      userId: row.userId,
    };
  },
});

/**
 * Advance a key's counter after a verified assertion. Throws on an unknown key
 * or a non-monotonic counter.
 *
 * The `counter > row.counter` check is re-evaluated INSIDE this transaction
 * (not just in the caller) against the freshly read row. Two assertions racing
 * in parallel actions both verify against the same stored counter; this
 * in-transaction recheck — plus the OCC read dependency on the row — ensures
 * exactly one wins and a stale/replayed counter is rejected.
 */
export const bumpCounter = internalMutation({
  args: { keyId: v.string(), counter: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Per-keyId cap on the most abusable verify path: every verifyAssertion
    // funnels through this mutation, so keying the limit here bounds assertion
    // replay/spam per device key.
    await rateLimitWithThrow(ctx, "userAction", args.keyId);

    const row = await ctx.db
      .query("appAttestKeys")
      .withIndex("by_keyId", (q) => q.eq("keyId", args.keyId))
      .unique();

    if (!row) {
      throw new Error(`Unknown App Attest key: ${args.keyId}`);
    }
    if (args.counter <= row.counter) {
      throw new Error(
        `Non-monotonic App Attest counter for ${args.keyId}: ${args.counter} <= ${row.counter}`
      );
    }

    await ctx.db.patch(row._id, { counter: args.counter });
    return null;
  },
});

// One bounded sweep deletes at most this many of the oldest challenges.
const CLEANUP_BATCH = 200;

/**
 * TTL sweep for expired challenges, scheduled hourly from crons.ts.
 *
 * `by_expiresAt` sorts ascending, so expired rows (smallest `expiresAt`)
 * always cluster at the FRONT. Each pass takes the front `CLEANUP_BATCH`,
 * deletes the expired ones, and reschedules only when the batch was full AND
 * contained at least one expired row.
 *
 * Termination: every reschedule deletes from the front, shrinking the run of
 * expired rows; once the front batch holds no expired row (`expired.length ===
 * 0`) the sweep stops. Unlike pushTokens.cleanupStale — whose removable rows
 * are scattered, forcing cursor pagination — here they are always front-sorted,
 * so front-delete is correct and needs no cursor.
 */
export const cleanupChallenges = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    const now = Date.now();
    const batch = await ctx.db
      .query("appAttestChallenges")
      .withIndex("by_expiresAt")
      .order("asc")
      .take(CLEANUP_BATCH);

    const expired = batch.filter((row) => row.expiresAt < now);
    await Promise.all(expired.map((row) => ctx.db.delete(row._id)));

    if (batch.length === CLEANUP_BATCH && expired.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.appAttestStore.cleanupChallenges,
        {}
      );
    }

    return expired.length;
  },
});
