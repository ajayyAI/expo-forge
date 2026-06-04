/**
 * Push Token Registration and Lifecycle
 *
 * One row per device per user. A token can transfer ownership when the same
 * device signs into a different account, so upsert keys on the token (not the
 * user). See schema.ts for the full lifecycle (active / stale / revoked).
 */

import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { activeUserMutation, authMutation, authQuery } from "./functions";
import { rateLimitWithThrow } from "./rateLimit";
import { deviceTypeValidator } from "./validators";

const pushTokenValidator = v.object({
  _id: v.id("pushTokens"),
  _creationTime: v.number(),
  userId: v.id("users"),
  token: v.string(),
  deviceType: deviceTypeValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
  lastSeenAt: v.optional(v.number()),
  revoked: v.optional(v.boolean()),
  revokedAt: v.optional(v.number()),
  lastErrorCode: v.optional(v.string()),
});

/**
 * Register or refresh the caller's push token.
 *
 * Keyed on the token via `by_token` because the same Expo token can move
 * between accounts when a device is re-signed-in. A successful client upsert
 * always means the token is alive, so any prior revocation is cleared.
 *
 * Gated on an active (non-deletion-pending) user: account deletion drops every
 * token, so a tombstoned client must not re-register and resurrect them inside
 * the grace window. `remove`/`removeAll` stay open — tearing down tokens is
 * always safe.
 */
export const upsert = activeUserMutation({
  args: { token: v.string(), deviceType: deviceTypeValidator },
  returns: v.id("pushTokens"),
  handler: async (ctx, args): Promise<Id<"pushTokens">> => {
    await rateLimitWithThrow(ctx, "userAction", ctx.user._id.toString());
    const now = Date.now();

    // `.unique()` reads the token's `by_token` range, establishing a read
    // dependency on it: a concurrent first-insert of the same token lands in
    // that scanned range and triggers an OCC conflict, so the losing mutation
    // retries, re-reads, and takes the patch/reassign branch — upholding the
    // one-row-per-token invariant instead of inserting a duplicate.
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: ctx.user._id,
        deviceType: args.deviceType,
        updatedAt: now,
        lastSeenAt: now,
        revoked: false,
        revokedAt: undefined,
        lastErrorCode: undefined,
      });
      return existing._id;
    }

    // Fresh insert leaves `revoked` unset (see schema lifecycle note).
    return await ctx.db.insert("pushTokens", {
      userId: ctx.user._id,
      token: args.token,
      deviceType: args.deviceType,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    });
  },
});

/** Remove a single token, only if it belongs to the caller. */
export const remove = authMutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rateLimitWithThrow(ctx, "userAction", ctx.user._id.toString());

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (existing && existing.userId === ctx.user._id) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const list = authQuery({
  args: {},
  returns: v.array(pushTokenValidator),
  handler: async (ctx): Promise<Doc<"pushTokens">[]> => {
    return await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
  },
});

/** Remove every token belonging to the caller (e.g. global sign-out). */
export const removeAll = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await rateLimitWithThrow(ctx, "userAction", ctx.user._id.toString());
    await deleteTokensForUser(ctx, ctx.user._id);
    return null;
  },
});

/**
 * Active (non-revoked) tokens for a user, used by the sender to skip dead
 * devices before hitting the Expo Push API. Active means `revoked` is unset
 * or false.
 */
export const listActiveByUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(v.object({ _id: v.id("pushTokens"), token: v.string() })),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return rows
      .filter((row) => !row.revoked)
      .map((row) => ({ _id: row._id, token: row.token }));
  },
});

/**
 * Tombstone tokens the Expo Push Service rejected with a permanent error.
 * Tombstoning (not deleting) stops a racing client retry from resurrecting a
 * dead device before the cleanup cron purges it. Missing ids are skipped.
 * Returns the number of rows tombstoned.
 */
export const markRevoked = internalMutation({
  args: {
    tokenIds: v.array(v.id("pushTokens")),
    errorCode: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const now = Date.now();
    let count = 0;
    for (const id of args.tokenIds) {
      const row = await ctx.db.get(id);
      if (!row) {
        continue;
      }
      await ctx.db.patch(id, {
        revoked: true,
        revokedAt: now,
        updatedAt: now,
        lastErrorCode: args.errorCode,
      });
      count++;
    }
    return count;
  },
});

const REVOKED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const STALE_ACTIVE_MS = 90 * 24 * 60 * 60 * 1000;
const CLEANUP_BATCH = 100;

/**
 * Daily cleanup pass. Purges revoked rows older than 30 days and stale active
 * rows (never re-upserted) older than 90 days, using `updatedAt` as the
 * freshness signal.
 *
 * Cursor-paginated, NOT `take()`-based: a `take()` of the front of
 * `by_revoked_updatedAt` would re-read the same non-removable rows every run
 * and reschedule forever once they exceed one batch. Pagination walks the
 * table once per cron tick in bounded pages and provably terminates — each
 * invocation advances `continueCursor` and only reschedules while `!isDone`,
 * so removable rows sitting behind many fresh rows are still reached on a
 * later page.
 */
export const cleanupStale = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const revokedCutoff = now - REVOKED_RETENTION_MS;
    const staleCutoff = now - STALE_ACTIVE_MS;

    const page = await ctx.db
      .query("pushTokens")
      .paginate({ cursor: args.cursor ?? null, numItems: CLEANUP_BATCH });

    let deleted = 0;
    for (const row of page.page) {
      const removable = row.revoked
        ? row.updatedAt < revokedCutoff
        : row.updatedAt < staleCutoff;
      if (removable) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.pushTokens.cleanupStale, {
        cursor: page.continueCursor,
      });
    }

    return deleted;
  },
});

/**
 * Hard-delete every token for a user. Shared by `removeAll` and account
 * deletion; tokens carry no recovery value, so deletion (not tombstoning) is
 * correct here. Plain helper, not a Convex function — call it with a mutation
 * ctx.
 */
export async function deleteTokensForUser(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<void> {
  const tokens = await ctx.db
    .query("pushTokens")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  await Promise.all(tokens.map((t) => ctx.db.delete(t._id)));
}
