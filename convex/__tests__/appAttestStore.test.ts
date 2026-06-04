import { internal } from "../_generated/api";
import { setupTest, type TestConvex } from "./_mockComponents";

const MIN_MS = 60 * 1000;

// cleanupChallenges self-reschedules via runAfter(0) when a full batch still
// had expired rows to delete. Drive that chain to completion under real timers
// so the final continuation settles before teardown. Bounded so a
// non-terminating sweep fails the test instead of hanging.
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
  throw new Error("cleanupChallenges did not terminate within 50 iterations");
}

describe("appAttestStore.createChallenge / consumeChallenge", () => {
  test("consumeChallenge returns true on first use and marks the row used", async () => {
    const t = setupTest();
    const now = Date.now();
    await t.mutation(internal.appAttestStore.createChallenge, {
      nonce: "n1",
      expiresAt: now + 5 * MIN_MS,
    });

    const ok = await t.mutation(internal.appAttestStore.consumeChallenge, {
      nonce: "n1",
      now,
    });
    expect(ok).toBe(true);

    const row = await t.run(async (ctx) =>
      ctx.db
        .query("appAttestChallenges")
        .withIndex("by_nonce", (q) => q.eq("nonce", "n1"))
        .unique()
    );
    expect(row?.used).toBe(true);
  });

  test("consumeChallenge returns false on the second use (replay blocked)", async () => {
    const t = setupTest();
    const now = Date.now();
    await t.mutation(internal.appAttestStore.createChallenge, {
      nonce: "n1",
      expiresAt: now + 5 * MIN_MS,
    });

    await t.mutation(internal.appAttestStore.consumeChallenge, {
      nonce: "n1",
      now,
    });
    const second = await t.mutation(internal.appAttestStore.consumeChallenge, {
      nonce: "n1",
      now,
    });
    expect(second).toBe(false);
  });

  test("consumeChallenge returns false for an expired challenge", async () => {
    const t = setupTest();
    const now = Date.now();
    await t.mutation(internal.appAttestStore.createChallenge, {
      nonce: "expired",
      expiresAt: now - 1,
    });

    const ok = await t.mutation(internal.appAttestStore.consumeChallenge, {
      nonce: "expired",
      now,
    });
    expect(ok).toBe(false);
  });

  test("consumeChallenge returns false for an unknown nonce", async () => {
    const t = setupTest();
    const ok = await t.mutation(internal.appAttestStore.consumeChallenge, {
      nonce: "never-issued",
      now: Date.now(),
    });
    expect(ok).toBe(false);
  });
});

describe("appAttestStore.storeKey / findKey", () => {
  test("storeKey inserts a fresh key with counter 0", async () => {
    const t = setupTest();
    const now = Date.now();
    await t.mutation(internal.appAttestStore.storeKey, {
      keyId: "k1",
      publicKey: "pub1",
      environment: "production",
      now,
    });

    const key = await t.query(internal.appAttestStore.findKey, { keyId: "k1" });
    expect(key).not.toBeNull();
    expect(key?.counter).toBe(0);
    expect(key?.publicKey).toBe("pub1");
    expect(key?.environment).toBe("production");
    expect(key?.userId).toBeUndefined();
  });

  test("re-store of the same keyId upserts: counter resets and userId is preserved", async () => {
    const t = setupTest();
    const now = Date.now();
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        authId: "auth_x",
        createdAt: now,
        updatedAt: now,
      })
    );

    await t.mutation(internal.appAttestStore.storeKey, {
      keyId: "k1",
      publicKey: "pub1",
      environment: "production",
      userId,
      now,
    });
    // Advance the counter to prove a re-store resets it.
    await t.mutation(internal.appAttestStore.bumpCounter, {
      keyId: "k1",
      counter: 7,
    });

    // Re-attest without a userId: the existing binding must be preserved.
    await t.mutation(internal.appAttestStore.storeKey, {
      keyId: "k1",
      publicKey: "pub2",
      environment: "development",
      now: now + 1,
    });

    const key = await t.query(internal.appAttestStore.findKey, { keyId: "k1" });
    expect(key?.counter).toBe(0);
    expect(key?.publicKey).toBe("pub2");
    expect(key?.environment).toBe("development");
    expect(key?.userId).toBe(userId);
  });

  test("findKey returns null for an unknown key", async () => {
    const t = setupTest();
    const key = await t.query(internal.appAttestStore.findKey, {
      keyId: "missing",
    });
    expect(key).toBeNull();
  });
});

describe("appAttestStore.bumpCounter", () => {
  async function seedKey(t: TestConvex, counter: number): Promise<void> {
    const now = Date.now();
    await t.mutation(internal.appAttestStore.storeKey, {
      keyId: "k1",
      publicKey: "pub1",
      environment: "production",
      now,
    });
    if (counter > 0) {
      await t.mutation(internal.appAttestStore.bumpCounter, {
        keyId: "k1",
        counter,
      });
    }
  }

  test("advances on a strictly-greater counter", async () => {
    const t = setupTest();
    await seedKey(t, 0);
    await t.mutation(internal.appAttestStore.bumpCounter, {
      keyId: "k1",
      counter: 3,
    });
    const key = await t.query(internal.appAttestStore.findKey, { keyId: "k1" });
    expect(key?.counter).toBe(3);
  });

  test("throws on an equal counter (monotonicity)", async () => {
    const t = setupTest();
    await seedKey(t, 5);
    await expect(
      t.mutation(internal.appAttestStore.bumpCounter, {
        keyId: "k1",
        counter: 5,
      })
    ).rejects.toThrow();
  });

  test("throws on a regressed counter (replay)", async () => {
    const t = setupTest();
    await seedKey(t, 5);
    await expect(
      t.mutation(internal.appAttestStore.bumpCounter, {
        keyId: "k1",
        counter: 4,
      })
    ).rejects.toThrow();
  });

  test("throws on an unknown keyId", async () => {
    const t = setupTest();
    await expect(
      t.mutation(internal.appAttestStore.bumpCounter, {
        keyId: "ghost",
        counter: 1,
      })
    ).rejects.toThrow();
  });
});

describe("appAttestStore.cleanupChallenges", () => {
  async function seed(
    t: TestConvex,
    rows: { nonce: string; expiresAt: number }[]
  ): Promise<void> {
    await t.run(async (ctx) => {
      for (const row of rows) {
        await ctx.db.insert("appAttestChallenges", {
          nonce: row.nonce,
          expiresAt: row.expiresAt,
          used: false,
        });
      }
    });
  }

  async function remaining(t: TestConvex): Promise<string[]> {
    return await t.run(async (ctx) => {
      const all = await ctx.db.query("appAttestChallenges").collect();
      return all.map((r) => r.nonce);
    });
  }

  test("deletes expired rows and keeps unexpired ones", async () => {
    const t = setupTest();
    const now = Date.now();
    await seed(t, [
      { nonce: "old-1", expiresAt: now - 10_000 },
      { nonce: "old-2", expiresAt: now - 5000 },
      { nonce: "live-1", expiresAt: now + 60_000 },
    ]);

    await t.mutation(internal.appAttestStore.cleanupChallenges, {});
    await drainScheduled(t);

    const left = await remaining(t);
    expect(left.sort()).toEqual(["live-1"]);
  });

  test("terminates when more than a batch of unexpired rows exist", async () => {
    const t = setupTest();
    const now = Date.now();
    // 250 live rows (> 200 BATCH), none expired: the front batch has no
    // expired rows, so the sweep deletes nothing and does not reschedule.
    const rows = Array.from({ length: 250 }, (_, i) => ({
      nonce: `live-${i}`,
      expiresAt: now + 60_000 + i,
    }));
    await seed(t, rows);

    await t.mutation(internal.appAttestStore.cleanupChallenges, {});
    await drainScheduled(t);

    const left = await remaining(t);
    expect(left).toHaveLength(250);
  });

  test("purges a large run of expired rows across reschedules and terminates", async () => {
    const t = setupTest();
    const now = Date.now();
    // 250 expired (front-sorted) + 3 live: the sweep needs more than one
    // 200-row batch and must reschedule, then stop once only live rows remain.
    const expired = Array.from({ length: 250 }, (_, i) => ({
      nonce: `old-${i}`,
      expiresAt: now - 10_000 + i,
    }));
    const live = [
      { nonce: "live-a", expiresAt: now + 60_000 },
      { nonce: "live-b", expiresAt: now + 70_000 },
      { nonce: "live-c", expiresAt: now + 80_000 },
    ];
    await seed(t, [...expired, ...live]);

    await t.mutation(internal.appAttestStore.cleanupChallenges, {});
    await drainScheduled(t);

    const left = await remaining(t);
    expect(left.sort()).toEqual(["live-a", "live-b", "live-c"]);
  });
});
