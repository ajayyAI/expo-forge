// Mirrors `ACCOUNT_DELETION_GRACE_MS` in convex/users.ts. Kept as a client
// constant rather than imported from the server module so the deletion UI
// doesn't drag the whole Convex server bundle (and its server-only deps) into
// the app. The value is purely presentational here — the backend enforces the
// real cutoff — but it must stay in sync so the date shown matches the cron.
const ACCOUNT_DELETION_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Timestamp (ms) at which a soft-deleted account becomes eligible for
 * permanent purge: the deletion request plus the grace window.
 */
export function permanentDeletionAt(deletedAt: number): number {
  return deletedAt + ACCOUNT_DELETION_GRACE_MS;
}
