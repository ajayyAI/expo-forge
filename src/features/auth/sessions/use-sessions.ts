import { useCallback, useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { translate } from "@/lib/i18n";

/** Shape we rely on from a Better Auth session row (extra fields ignored). */
export interface SessionRow {
  id: string;
  token: string;
  createdAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

interface SessionsState {
  sessions: SessionRow[];
  loading: boolean;
  error?: string;
  /** Token of the session currently being revoked, if any. */
  revokingToken?: string;
  refresh: () => Promise<void>;
  revoke: (token: string) => Promise<void>;
}

/**
 * Loads the active sessions via the Better Auth client (a promise-based call, not
 * a Convex query) with loading/error/refresh state, plus per-row revoke. Revoke
 * is guarded against double-tap and refreshes the list on success.
 */
export function useSessions(): SessionsState {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [revokingToken, setRevokingToken] = useState<string | undefined>();
  // Guards revoke re-entry before `revokingToken` (and the disabled state) lands.
  const revokingRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const { data, error: listError } = await authClient.listSessions();
    if (listError || !data) {
      setError(translate("sessions.errors.load_failed"));
      setLoading(false);
      return;
    }
    setSessions(data);
    setLoading(false);
  }, []);

  const revoke = useCallback(
    async (token: string) => {
      if (revokingRef.current) {
        return;
      }
      revokingRef.current = true;
      setRevokingToken(token);
      setError(undefined);
      try {
        const { error: revokeError } = await authClient.revokeSession({
          token,
        });
        if (revokeError) {
          setError(translate("sessions.errors.revoke_failed"));
          return;
        }
        await refresh();
      } catch {
        setError(translate("sessions.errors.revoke_failed"));
      } finally {
        revokingRef.current = false;
        setRevokingToken(undefined);
      }
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, error, revokingToken, refresh, revoke };
}
