/**
 * Minimal mock Convex components for `convex-test`.
 *
 * The account-lifecycle code calls into two installed components:
 *   - `betterAuth` for sign-out / account teardown (adapter.findOne/findMany/
 *     deleteMany/deleteOne) and identity reads (used by safeGetAuthUser /
 *     getAnyUserById through ctx.runQuery on betterAuth.adapter.findOne).
 *   - `rateLimiter` for the limit() calls in the mutations.
 *
 * convex-test does not bundle real component implementations, so these mocks
 * provide just enough surface — backed by simple in-component tables — for the
 * real handler code paths to run end to end under test. Production deploys use
 * the genuine components; this file is test-only.
 */

import type { FunctionReference } from "convex/server";
import {
  defineSchema,
  defineTable,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { v } from "convex/values";
import { convexTest } from "convex-test";

import { components } from "../_generated/api";
import schema from "../schema";

// ---------------------------------------------------------------------------
// Convex function modules under test (explicit map; Jest has no import.meta).
// ---------------------------------------------------------------------------
const appModules = {
  "../schema.ts": () => import("../schema"),
  "../users.ts": () => import("../users"),
  "../pushTokens.ts": () => import("../pushTokens"),
  "../pushSender.ts": () => import("../pushSender"),
  "../appAttestStore.ts": () => import("../appAttestStore"),
  "../auth.ts": () => import("../auth"),
  "../auth.config.ts": () => import("../auth.config"),
  "../functions.ts": () => import("../functions"),
  "../errors.ts": () => import("../errors"),
  "../constants.ts": () => import("../constants"),
  "../validators.ts": () => import("../validators"),
  "../rateLimit.ts": () => import("../rateLimit"),
  "../email.ts": () => import("../email"),
  "../env.ts": () => import("../env"),
  "../apple.ts": () => import("../apple"),
  "../crons.ts": () => import("../crons"),
  "../http.ts": () => import("../http"),
  "../_generated/server.ts": () => import("../_generated/server"),
  "../_generated/api.ts": () => import("../_generated/api"),
};

// ---------------------------------------------------------------------------
// rateLimiter mock: lib.rateLimit always succeeds (never throttles in tests).
// ---------------------------------------------------------------------------
const rateLimiterSchema = defineSchema({
  noop: defineTable({ k: v.string() }),
});

const rateLimiterModules = {
  "./schema.ts": () => Promise.resolve({ default: rateLimiterSchema }),
  "./lib.ts": () =>
    Promise.resolve({
      rateLimit: mutationGeneric({
        handler: () => ({ ok: true, retryAfter: undefined }),
      }),
      checkRateLimit: queryGeneric({
        handler: () => ({ ok: true, retryAfter: undefined }),
      }),
    }),
  "./_generated/server.ts": () => import("../_generated/server"),
};

// ---------------------------------------------------------------------------
// betterAuth mock: a tiny adapter over `user`, `session`, `account`,
// `verification` tables, matching the where/pagination shapes the lifecycle
// code uses. Each row carries an opaque `_id` string (the Better Auth id) plus
// model fields; convex-test gives the document its own internal id.
// ---------------------------------------------------------------------------
const betterAuthSchema = defineSchema({
  user: defineTable({
    id: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
    expiresAt: v.optional(v.number()),
  }),
  session: defineTable({
    id: v.string(),
    userId: v.string(),
    expiresAt: v.number(),
  }),
  account: defineTable({
    id: v.string(),
    userId: v.string(),
    providerId: v.string(),
    refreshToken: v.optional(v.string()),
  }),
  verification: defineTable({
    id: v.string(),
    identifier: v.string(),
  }),
});

interface Where {
  field: string;
  value: unknown;
  operator?: string;
  connector?: string;
}

// The generic component ctx exposes an untyped db (tables are addressed by
// dynamic Better Auth model strings here). A narrow structural type keeps the
// handlers free of `any` while allowing string table names.
interface GenericDb {
  query: (table: string) => {
    collect: () => Promise<Record<string, unknown>[]>;
  };
  insert: (table: string, doc: Record<string, unknown>) => Promise<unknown>;
  delete: (id: unknown) => Promise<void>;
}
interface GenericDbCtx {
  db: GenericDb;
}

// Better Auth code reads `doc._id` as the canonical id, so present the opaque
// `id` field under `_id` (convex-test's own `_id` is an internal handle).
function asAuthDoc(doc: Record<string, unknown>): Record<string, unknown> {
  return { ...doc, _id: doc.id };
}

function matchesWhere(doc: Record<string, unknown>, where: Where[]): boolean {
  return where.every((clause) => {
    const actual = clause.field === "_id" ? doc.id : doc[clause.field];
    if (clause.operator === "gt") {
      return (
        typeof actual === "number" &&
        typeof clause.value === "number" &&
        actual > clause.value
      );
    }
    return actual === clause.value;
  });
}

const betterAuthModules = {
  "./schema.ts": () => Promise.resolve({ default: betterAuthSchema }),
  "./_generated/server.ts": () => import("../_generated/server"),
  // Test-only seeding: component tables are isolated from the root db, so the
  // only way to populate them is a mutation that runs inside the component.
  "./seed.ts": () =>
    Promise.resolve({
      insert: mutationGeneric({
        handler: async (
          ctx,
          args: { model: string; doc: Record<string, unknown> }
        ) => {
          await (ctx as unknown as GenericDbCtx).db.insert(
            args.model,
            args.doc
          );
          return null;
        },
      }),
    }),
  "./adapter.ts": () =>
    Promise.resolve({
      findOne: queryGeneric({
        handler: async (ctx, args: { model: string; where: Where[] }) => {
          const docs = await (ctx as unknown as GenericDbCtx).db
            .query(args.model)
            .collect();
          const hit = docs.find((d: Record<string, unknown>) =>
            matchesWhere(d, args.where)
          );
          return hit ? asAuthDoc(hit) : null;
        },
      }),
      findMany: queryGeneric({
        handler: async (ctx, args: { model: string; where?: Where[] }) => {
          const docs = await (ctx as unknown as GenericDbCtx).db
            .query(args.model)
            .collect();
          const page = docs
            .filter((d: Record<string, unknown>) =>
              args.where ? matchesWhere(d, args.where) : true
            )
            .map(asAuthDoc);
          return { page, continueCursor: "", isDone: true };
        },
      }),
      deleteMany: mutationGeneric({
        handler: async (
          ctx,
          args: { input: { model: string; where?: Where[] } }
        ) => {
          const docs = await (ctx as unknown as GenericDbCtx).db
            .query(args.input.model)
            .collect();
          const toDelete = docs.filter((d: Record<string, unknown>) =>
            args.input.where ? matchesWhere(d, args.input.where) : true
          );
          for (const d of toDelete) {
            await (ctx as unknown as GenericDbCtx).db.delete(d._id);
          }
          return { isDone: true, continueCursor: "" };
        },
      }),
      deleteOne: mutationGeneric({
        handler: async (
          ctx,
          args: { input: { model: string; where: Where[] } }
        ) => {
          const docs = await (ctx as unknown as GenericDbCtx).db
            .query(args.input.model)
            .collect();
          const hit = docs.find((d: Record<string, unknown>) =>
            matchesWhere(d, args.input.where)
          );
          if (hit) {
            await (ctx as unknown as GenericDbCtx).db.delete(hit._id);
          }
          return null;
        },
      }),
    }),
};

/**
 * Build a convex-test instance with the app schema + modules and the mock
 * `rateLimiter` and `betterAuth` components registered.
 */
export function setupTest() {
  const t = convexTest(schema, appModules);
  t.registerComponent("rateLimiter", rateLimiterSchema, rateLimiterModules);
  t.registerComponent("betterAuth", betterAuthSchema, betterAuthModules);
  return t;
}

export type TestConvex = ReturnType<typeof setupTest>;

// Reference to the betterAuth mock seed mutation, used by tests to populate the
// component's isolated tables from a root `t.run`. Typed as a public mutation
// reference so `ctx.runMutation` accepts the seed args.
export const betterAuthSeedInsert = (
  components as unknown as {
    betterAuth: {
      seed: {
        insert: FunctionReference<
          "mutation",
          "public",
          { model: string; doc: Record<string, unknown> },
          null
        >;
      };
    };
  }
).betterAuth.seed.insert;

// Reference to the betterAuth mock adapter.findOne query, for assertions.
export const betterAuthFindOne = (
  components as unknown as {
    betterAuth: {
      adapter: {
        findOne: FunctionReference<
          "query",
          "public",
          {
            model: string;
            where: { field: string; value: unknown; operator?: string }[];
          },
          Record<string, unknown> | null
        >;
      };
    };
  }
).betterAuth.adapter.findOne;
