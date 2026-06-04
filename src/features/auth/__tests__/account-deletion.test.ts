/**
 * `permanentDeletionAt` projects a soft-delete timestamp to the moment the
 * account becomes eligible for permanent purge. The offset must match the
 * 30-day grace window the backend cron enforces.
 */

import { permanentDeletionAt } from "../account-deletion";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

describe("permanentDeletionAt", () => {
  it("adds the 30-day grace window to the deletion timestamp", () => {
    const deletedAt = Date.UTC(2026, 0, 1);
    expect(permanentDeletionAt(deletedAt)).toBe(deletedAt + THIRTY_DAYS_MS);
  });

  it("is exactly 30 days out", () => {
    const deletedAt = 1_700_000_000_000;
    const days = (permanentDeletionAt(deletedAt) - deletedAt) / 86_400_000;
    expect(days).toBe(30);
  });
});
