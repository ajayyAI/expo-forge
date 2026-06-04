import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { ACCOUNT_DELETION_GRACE_MS } from "../users";
import { validateBio } from "../validators";
import {
  betterAuthFindOne,
  betterAuthSeedInsert,
  setupTest,
  type TestConvex,
} from "./_mockComponents";

const GRACE_MS = ACCOUNT_DELETION_GRACE_MS;
const BIO_TOO_LONG_RE = /500 characters or less/;
const DELETION_PENDING_RE = /AUTH_1002|pending deletion/;

// Seed a Better Auth user + live session in the mock component, plus the app
// users row, and return both ids. `t.withIdentity({ subject, sessionId })`
// then satisfies safeGetAuthUser, which reads session + user via the mock
// adapter.findOne.
async function seedUser(
  t: TestConvex,
  opts: { authId?: string; deletedAt?: number } = {}
): Promise<{ userId: Id<"users">; authId: string; sessionId: string }> {
  const authId = opts.authId ?? `auth_${Math.random().toString(36).slice(2)}`;
  const sessionId = `sess_${authId}`;
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      authId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(opts.deletedAt === undefined ? {} : { deletedAt: opts.deletedAt }),
    });
  });
  await t.run(async (ctx) => {
    await ctx.runMutation(betterAuthSeedInsert, {
      model: "user",
      doc: {
        id: authId,
        email: `${authId}@example.com`,
        name: "Test User",
        image: null,
      },
    });
    await ctx.runMutation(betterAuthSeedInsert, {
      model: "session",
      doc: {
        id: sessionId,
        userId: authId,
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
    });
  });
  return { userId, authId, sessionId };
}

function asUser(t: TestConvex, authId: string, sessionId: string) {
  return t.withIdentity({ subject: authId, sessionId });
}

// hardDeleteExpired self-reschedules its next batch via runAfter(0). Under real
// timers, drive that chain to completion so the final continuation settles
// before teardown (otherwise it logs after the test ends). Bounded so a
// non-terminating walk fails instead of hanging.
async function drainScheduled(t: TestConvex) {
  for (let i = 0; i < 50; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await t.finishInProgressScheduledFunctions();
    const pending = await t.run(async (ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    );
    const live = pending.filter(
      (f) => f.state.kind === "pending" || f.state.kind === "inProgress"
    );
    if (live.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await t.finishInProgressScheduledFunctions();
      return;
    }
  }
  throw new Error(
    "hardDeleteExpired did not terminate within 50 drain iterations"
  );
}

describe("validateBio", () => {
  test("accepts bios at or under 500 characters", () => {
    expect(validateBio("").valid).toBe(true);
    expect(validateBio("a".repeat(500)).valid).toBe(true);
  });

  test("rejects bios over 500 characters", () => {
    const result = validateBio("a".repeat(501));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(BIO_TOO_LONG_RE);
  });
});

describe("performAccountDeletion", () => {
  test("sets deletedAt, writes a 'requested' audit row, and drops push tokens", async () => {
    const t = setupTest();
    const { userId, authId, sessionId } = await seedUser(t);

    // Seed two push tokens for this user and one for a different user.
    const otherUser = await seedUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("pushTokens", {
        userId,
        token: "tok-a",
        deviceType: "ios",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("pushTokens", {
        userId,
        token: "tok-b",
        deviceType: "android",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("pushTokens", {
        userId: otherUser.userId,
        token: "tok-other",
        deviceType: "ios",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const before = Date.now();
    const res = await asUser(t, authId, sessionId).mutation(
      internal.users.performAccountDeletion,
      {}
    );
    expect(res.success).toBe(true);
    expect(res.deletedAt).toBeGreaterThanOrEqual(before);

    await t.run(async (ctx) => {
      const user = await ctx.db.get(userId);
      expect(typeof user?.deletedAt).toBe("number");

      const audit = await ctx.db
        .query("accountDeletionAudit")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      expect(audit.map((a) => a.event)).toContain("requested");

      const mine = await ctx.db
        .query("pushTokens")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      expect(mine).toHaveLength(0);

      const others = await ctx.db
        .query("pushTokens")
        .withIndex("by_user", (q) => q.eq("userId", otherUser.userId))
        .collect();
      expect(others).toHaveLength(1);
    });
  });

  test("is idempotent: a second call keeps the original deletedAt", async () => {
    const t = setupTest();
    const { userId, authId, sessionId } = await seedUser(t);
    const first = await asUser(t, authId, sessionId).mutation(
      internal.users.performAccountDeletion,
      {}
    );
    // deleteAccount signs the user out, so a faithful retry models a still-live
    // session racing the sign-out: re-seed a session before the second call.
    const sessionId2 = `${sessionId}-retry`;
    await t.run(async (ctx) => {
      await ctx.runMutation(betterAuthSeedInsert, {
        model: "session",
        doc: {
          id: sessionId2,
          userId: authId,
          expiresAt: Date.now() + 60 * 60 * 1000,
        },
      });
    });
    const second = await asUser(t, authId, sessionId2).mutation(
      internal.users.performAccountDeletion,
      {}
    );
    expect(second.deletedAt).toBe(first.deletedAt);
    await t.run(async (ctx) => {
      const audit = await ctx.db
        .query("accountDeletionAudit")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      expect(audit.filter((a) => a.event === "requested")).toHaveLength(1);
    });
  });
});

describe("restoreAccount", () => {
  test("clears deletedAt within the grace window and writes a 'restored' audit", async () => {
    const t = setupTest();
    const recent = Date.now() - GRACE_MS / 2;
    const { userId, authId, sessionId } = await seedUser(t, {
      deletedAt: recent,
    });

    const res = await asUser(t, authId, sessionId).mutation(
      api.users.restoreAccount,
      {}
    );
    expect(res.success).toBe(true);

    await t.run(async (ctx) => {
      const user = await ctx.db.get(userId);
      expect(user?.deletedAt).toBeUndefined();
      const audit = await ctx.db
        .query("accountDeletionAudit")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      expect(audit.map((a) => a.event)).toContain("restored");
    });
  });

  test("refuses to restore once the grace window has expired", async () => {
    const t = setupTest();
    const expiredAt = Date.now() - GRACE_MS - 1000;
    const { userId, authId, sessionId } = await seedUser(t, {
      deletedAt: expiredAt,
    });

    await expect(
      asUser(t, authId, sessionId).mutation(api.users.restoreAccount, {})
    ).rejects.toThrow();

    await t.run(async (ctx) => {
      const user = await ctx.db.get(userId);
      expect(typeof user?.deletedAt).toBe("number");
      const audit = await ctx.db
        .query("accountDeletionAudit")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      expect(audit.map((a) => a.event)).not.toContain("restored");
    });
  });
});

describe("activeUserMutation deletion-pending gate", () => {
  test("a non-deleted user can updateProfile", async () => {
    const t = setupTest();
    const { userId, authId, sessionId } = await seedUser(t);

    const returnedId = await asUser(t, authId, sessionId).mutation(
      api.users.updateProfile,
      { bio: "hello" }
    );
    expect(returnedId).toBe(userId);

    await t.run(async (ctx) => {
      const user = await ctx.db.get(userId);
      expect(user?.bio).toBe("hello");
    });
  });

  test("a soft-deleted user is rejected with ACCOUNT_DELETION_PENDING", async () => {
    const t = setupTest();
    const { authId, sessionId } = await seedUser(t, {
      deletedAt: Date.now() - GRACE_MS / 2,
    });

    await expect(
      asUser(t, authId, sessionId).mutation(api.users.updateProfile, {
        bio: "nope",
      })
    ).rejects.toThrow(DELETION_PENDING_RE);
  });

  test("restoreAccount still succeeds for a soft-deleted user", async () => {
    const t = setupTest();
    const { userId, authId, sessionId } = await seedUser(t, {
      deletedAt: Date.now() - GRACE_MS / 2,
    });

    const res = await asUser(t, authId, sessionId).mutation(
      api.users.restoreAccount,
      {}
    );
    expect(res.success).toBe(true);

    await t.run(async (ctx) => {
      const user = await ctx.db.get(userId);
      expect(user?.deletedAt).toBeUndefined();
    });
  });
});

describe("hardDeleteExpired", () => {
  test("purges a user past the grace window and writes 'permanent'", async () => {
    const t = setupTest();
    const expiredAt = Date.now() - GRACE_MS - 1000;
    const { userId, authId } = await seedUser(t, { deletedAt: expiredAt });

    const purged = await t.mutation(internal.users.hardDeleteExpired, {});
    expect(purged).toBe(1);

    await t.run(async (ctx) => {
      // onDelete trigger isn't wired through the mock adapter, so the app
      // users row may remain; what matters is the Better Auth user is gone
      // and a 'permanent' audit row was written for this user.
      const audit = await ctx.db
        .query("accountDeletionAudit")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      expect(audit.map((a) => a.event)).toContain("permanent");

      const authUser = await ctx.runQuery(betterAuthFindOne, {
        model: "user",
        where: [{ field: "_id", value: authId }],
      });
      expect(authUser).toBeNull();
    });
  });

  test("does NOT purge a user still inside the grace window (boundary)", async () => {
    const t = setupTest();
    // Just inside the window: deleted slightly less than GRACE_MS ago.
    const stillInside = Date.now() - GRACE_MS + 60 * 1000;
    const { userId } = await seedUser(t, { deletedAt: stillInside });

    const purged = await t.mutation(internal.users.hardDeleteExpired, {});
    expect(purged).toBe(0);

    await t.run(async (ctx) => {
      const user = await ctx.db.get(userId);
      expect(user).not.toBeNull();
      expect(typeof user?.deletedAt).toBe("number");
      const audit = await ctx.db
        .query("accountDeletionAudit")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      expect(audit.map((a) => a.event)).not.toContain("permanent");
    });
  });

  test("respects HARD_DELETE_BATCH (50) and reschedules for the remainder", async () => {
    const t = setupTest();
    const expiredAt = Date.now() - GRACE_MS - 1000;
    // 60 expired users: one batch of 50 should be purged synchronously.
    for (let i = 0; i < 60; i++) {
      await seedUser(t, { authId: `batch_${i}`, deletedAt: expiredAt - i });
    }

    const purged = await t.mutation(internal.users.hardDeleteExpired, {});
    expect(purged).toBe(50);

    await t.run(async (ctx) => {
      const permanent = await ctx.db
        .query("accountDeletionAudit")
        .withIndex("by_event_at", (q) => q.eq("event", "permanent"))
        .collect();
      expect(permanent).toHaveLength(50);
    });

    // purgeUser deletes the Better Auth user and relies on its onDelete trigger
    // to drop the app `users` row, but that trigger isn't wired through the mock
    // adapter, so purged rows linger and `by_deletedAt` keeps re-finding them.
    // Simulate the trigger here so the rescheduled continuation can finish the
    // remainder and terminate instead of rescheduling forever.
    await t.run(async (ctx) => {
      const purgedUsers = await ctx.db
        .query("users")
        .withIndex("by_deletedAt", (q) => q.gt("deletedAt", 0))
        .collect();
      for (const user of purgedUsers) {
        const stillHasAuth = await ctx.runQuery(betterAuthFindOne, {
          model: "user",
          where: [{ field: "_id", value: user.authId }],
        });
        if (!stillHasAuth) {
          await ctx.db.delete(user._id);
        }
      }
    });

    // Drain the rescheduled continuation that purges the remaining 10 so it
    // settles before teardown instead of logging after the test ends.
    await drainScheduled(t);
  });
});
