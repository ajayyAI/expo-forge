import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  betterAuthSeedInsert,
  setupTest,
  type TestConvex,
} from "./_mockComponents";

const DAY_MS = 24 * 60 * 60 * 1000;

// Seed an app users row + Better Auth user/session so authMutation/authQuery
// resolve ctx.user. Mirrors the helper in users.test.ts.
async function seedUser(
  t: TestConvex,
  opts: { authId?: string } = {}
): Promise<{ userId: Id<"users">; authId: string; sessionId: string }> {
  const authId = opts.authId ?? `auth_${Math.random().toString(36).slice(2)}`;
  const sessionId = `sess_${authId}`;
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      authId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  await t.run(async (ctx) => {
    await ctx.runMutation(betterAuthSeedInsert, {
      model: "user",
      doc: {
        id: authId,
        email: `${authId}@example.com`,
        name: "T",
        image: null,
      },
    });
    await ctx.runMutation(betterAuthSeedInsert, {
      model: "session",
      doc: { id: sessionId, userId: authId, expiresAt: Date.now() + 3_600_000 },
    });
  });
  return { userId, authId, sessionId };
}

function asUser(t: TestConvex, authId: string, sessionId: string) {
  return t.withIdentity({ subject: authId, sessionId });
}

// cleanupStale paginates by rescheduling the next page via runAfter(0). Under
// real timers, drive the chain manually: yield so the scheduler's setTimeout(0)
// fires, finish the in-progress page, repeat until nothing remains pending.
// Bounded iteration count so a non-terminating walk fails the test instead of
// hanging.
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
      // One more yield+finish so any timer registered by the final page fires
      // and settles before the test tears down (avoids late post-teardown logs).
      await new Promise((resolve) => setTimeout(resolve, 0));
      await t.finishInProgressScheduledFunctions();
      return;
    }
  }
  throw new Error("cleanupStale did not terminate within 50 drain iterations");
}

async function getByToken(t: TestConvex, token: string) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique()
  );
}

describe("pushTokens.upsert", () => {
  test("inserts a fresh row with revoked unset", async () => {
    const t = setupTest();
    const { authId, sessionId, userId } = await seedUser(t);

    const id = await asUser(t, authId, sessionId).mutation(
      api.pushTokens.upsert,
      { token: "tok-1", deviceType: "ios" }
    );
    expect(id).toBeDefined();

    const row = await getByToken(t, "tok-1");
    expect(row?.userId).toBe(userId);
    expect(row?.deviceType).toBe("ios");
    expect(row?.revoked).toBeUndefined();
    expect(row?.lastSeenAt).toBeDefined();
  });

  test("rejects a deletion-pending user (can't resurrect dropped tokens)", async () => {
    const t = setupTest();
    const { authId, sessionId, userId } = await seedUser(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(userId, { deletedAt: Date.now() });
    });

    await expect(
      asUser(t, authId, sessionId).mutation(api.pushTokens.upsert, {
        token: "tok-deleted",
        deviceType: "ios",
      })
      // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    ).rejects.toThrow(/AUTH_1002|pending deletion/);

    expect(await getByToken(t, "tok-deleted")).toBeNull();
  });

  test("re-upsert by same user refreshes timestamps and clears revocation", async () => {
    const t = setupTest();
    const { authId, sessionId } = await seedUser(t);
    await asUser(t, authId, sessionId).mutation(api.pushTokens.upsert, {
      token: "tok-1",
      deviceType: "ios",
    });

    // Simulate a prior revocation + stale timestamps.
    const original = await getByToken(t, "tok-1");
    if (!original) {
      throw new Error("expected seeded token");
    }
    await t.run(async (ctx) => {
      await ctx.db.patch(original._id, {
        revoked: true,
        revokedAt: Date.now() - DAY_MS,
        lastErrorCode: "DeviceNotRegistered",
        updatedAt: Date.now() - DAY_MS,
      });
    });

    await asUser(t, authId, sessionId).mutation(api.pushTokens.upsert, {
      token: "tok-1",
      deviceType: "ios",
    });

    const row = await getByToken(t, "tok-1");
    expect(row?._id).toBe(original._id);
    expect(row?.revoked).toBe(false);
    expect(row?.revokedAt).toBeUndefined();
    expect(row?.lastErrorCode).toBeUndefined();
    expect(row?.updatedAt).toBeGreaterThan(original.updatedAt);
  });

  test("upsert of a token owned by another user reassigns it to the caller", async () => {
    const t = setupTest();
    const owner = await seedUser(t);
    const claimant = await seedUser(t);

    await asUser(t, owner.authId, owner.sessionId).mutation(
      api.pushTokens.upsert,
      { token: "shared", deviceType: "android" }
    );
    const first = await getByToken(t, "shared");
    expect(first?.userId).toBe(owner.userId);

    await asUser(t, claimant.authId, claimant.sessionId).mutation(
      api.pushTokens.upsert,
      { token: "shared", deviceType: "ios" }
    );

    const row = await getByToken(t, "shared");
    expect(row?._id).toBe(first?._id);
    expect(row?.userId).toBe(claimant.userId);
    expect(row?.deviceType).toBe("ios");
  });
});

describe("pushTokens.remove", () => {
  test("deletes only the caller's token, leaves another user's untouched", async () => {
    const t = setupTest();
    const me = await seedUser(t);
    const other = await seedUser(t);
    await asUser(t, me.authId, me.sessionId).mutation(api.pushTokens.upsert, {
      token: "mine",
      deviceType: "ios",
    });
    await asUser(t, other.authId, other.sessionId).mutation(
      api.pushTokens.upsert,
      { token: "theirs", deviceType: "ios" }
    );

    // Caller cannot delete a token they don't own.
    await asUser(t, me.authId, me.sessionId).mutation(api.pushTokens.remove, {
      token: "theirs",
    });
    expect(await getByToken(t, "theirs")).not.toBeNull();

    await asUser(t, me.authId, me.sessionId).mutation(api.pushTokens.remove, {
      token: "mine",
    });
    expect(await getByToken(t, "mine")).toBeNull();
  });
});

describe("pushTokens.removeAll", () => {
  test("clears all of the caller's tokens, leaves others'", async () => {
    const t = setupTest();
    const me = await seedUser(t);
    const other = await seedUser(t);
    await asUser(t, me.authId, me.sessionId).mutation(api.pushTokens.upsert, {
      token: "a",
      deviceType: "ios",
    });
    await asUser(t, me.authId, me.sessionId).mutation(api.pushTokens.upsert, {
      token: "b",
      deviceType: "android",
    });
    await asUser(t, other.authId, other.sessionId).mutation(
      api.pushTokens.upsert,
      { token: "c", deviceType: "ios" }
    );

    await asUser(t, me.authId, me.sessionId).mutation(
      api.pushTokens.removeAll,
      {}
    );

    const mine = await asUser(t, me.authId, me.sessionId).query(
      api.pushTokens.list,
      {}
    );
    expect(mine).toHaveLength(0);
    expect(await getByToken(t, "c")).not.toBeNull();
  });
});

describe("pushTokens.list", () => {
  test("returns only the caller's tokens", async () => {
    const t = setupTest();
    const me = await seedUser(t);
    const other = await seedUser(t);
    await asUser(t, me.authId, me.sessionId).mutation(api.pushTokens.upsert, {
      token: "a",
      deviceType: "ios",
    });
    await asUser(t, other.authId, other.sessionId).mutation(
      api.pushTokens.upsert,
      { token: "b", deviceType: "ios" }
    );

    const rows = await asUser(t, me.authId, me.sessionId).query(
      api.pushTokens.list,
      {}
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.token).toBe("a");
  });
});

describe("pushTokens.listActiveByUser", () => {
  test("excludes revoked tokens", async () => {
    const t = setupTest();
    const { userId } = await seedUser(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("pushTokens", {
        userId,
        token: "active",
        deviceType: "ios",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("pushTokens", {
        userId,
        token: "dead",
        deviceType: "ios",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        revoked: true,
        revokedAt: Date.now(),
      });
    });

    const active = await t.query(internal.pushTokens.listActiveByUser, {
      userId,
    });
    expect(active).toHaveLength(1);
    expect(active[0]?.token).toBe("active");
  });
});

describe("pushTokens.markRevoked", () => {
  test("tombstones existing rows and skips missing ids", async () => {
    const t = setupTest();
    const { userId } = await seedUser(t);
    const id = await t.run(async (ctx) =>
      ctx.db.insert("pushTokens", {
        userId,
        token: "x",
        deviceType: "ios",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
    // A syntactically valid id that does not exist (deleted row).
    const ghost = await t.run(async (ctx) => {
      const tmp = await ctx.db.insert("pushTokens", {
        userId,
        token: "ghost",
        deviceType: "ios",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(tmp);
      return tmp;
    });

    const count = await t.mutation(internal.pushTokens.markRevoked, {
      tokenIds: [id, ghost],
      errorCode: "DeviceNotRegistered",
    });
    expect(count).toBe(1);

    const row = await t.run(async (ctx) => ctx.db.get(id));
    expect(row).not.toBeNull();
    expect(row?.revoked).toBe(true);
    expect(row?.revokedAt).toBeDefined();
    expect(row?.lastErrorCode).toBe("DeviceNotRegistered");
  });
});

describe("pushTokens.cleanupStale", () => {
  test("purges old revoked rows, keeps recently-revoked ones", async () => {
    const t = setupTest();
    const { userId } = await seedUser(t);
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("pushTokens", {
        userId,
        token: "old-revoked",
        deviceType: "ios",
        createdAt: now - 40 * DAY_MS,
        updatedAt: now - 31 * DAY_MS,
        revoked: true,
        revokedAt: now - 31 * DAY_MS,
      });
      await ctx.db.insert("pushTokens", {
        userId,
        token: "fresh-revoked",
        deviceType: "ios",
        createdAt: now - 5 * DAY_MS,
        updatedAt: now - DAY_MS,
        revoked: true,
        revokedAt: now - DAY_MS,
      });
    });

    const deleted = await t.mutation(internal.pushTokens.cleanupStale, {});
    expect(deleted).toBe(1);
    expect(await getByToken(t, "old-revoked")).toBeNull();
    expect(await getByToken(t, "fresh-revoked")).not.toBeNull();
  });

  test("purges stale active rows past 90 days, keeps recent ones", async () => {
    const t = setupTest();
    const { userId } = await seedUser(t);
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("pushTokens", {
        userId,
        token: "stale-active",
        deviceType: "ios",
        createdAt: now - 100 * DAY_MS,
        updatedAt: now - 91 * DAY_MS,
      });
      await ctx.db.insert("pushTokens", {
        userId,
        token: "recent-active",
        deviceType: "ios",
        createdAt: now - 10 * DAY_MS,
        updatedAt: now - DAY_MS,
      });
    });

    const deleted = await t.mutation(internal.pushTokens.cleanupStale, {});
    expect(deleted).toBe(1);
    expect(await getByToken(t, "stale-active")).toBeNull();
    expect(await getByToken(t, "recent-active")).not.toBeNull();
  });

  test("terminates when more than a batch of non-removable rows exist", async () => {
    const t = setupTest();
    const { userId } = await seedUser(t);
    const now = Date.now();
    // 150 fresh active rows: > one 100-row batch, none removable.
    await t.run(async (ctx) => {
      for (let i = 0; i < 150; i++) {
        await ctx.db.insert("pushTokens", {
          userId,
          token: `fresh-${i}`,
          deviceType: "ios",
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    // A single invocation is bounded — deletes nothing and returns rather than
    // looping. The rescheduled walk drains and self-terminates.
    const deleted = await t.mutation(internal.pushTokens.cleanupStale, {});
    expect(deleted).toBe(0);
    await drainScheduled(t);

    const remaining = await t.run(async (ctx) =>
      ctx.db.query("pushTokens").collect()
    );
    expect(remaining).toHaveLength(150);
  });

  test("purges removable rows positioned behind a full batch of fresh rows", async () => {
    const t = setupTest();
    const { userId } = await seedUser(t);
    const now = Date.now();
    await t.run(async (ctx) => {
      // 120 fresh rows fill the first batch+.
      for (let i = 0; i < 120; i++) {
        await ctx.db.insert("pushTokens", {
          userId,
          token: `fresh-${i}`,
          deviceType: "ios",
          createdAt: now,
          updatedAt: now,
        });
      }
      // Removable revoked row inserted last so it lands on a later page.
      await ctx.db.insert("pushTokens", {
        userId,
        token: "buried-revoked",
        deviceType: "ios",
        createdAt: now - 40 * DAY_MS,
        updatedAt: now - 31 * DAY_MS,
        revoked: true,
        revokedAt: now - 31 * DAY_MS,
      });
    });

    await t.mutation(internal.pushTokens.cleanupStale, {});
    await drainScheduled(t);

    expect(await getByToken(t, "buried-revoked")).toBeNull();
    const remaining = await t.run(async (ctx) =>
      ctx.db.query("pushTokens").collect()
    );
    expect(remaining).toHaveLength(120);
  });
});
