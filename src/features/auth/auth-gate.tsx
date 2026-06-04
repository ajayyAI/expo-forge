import { api } from "convex/_generated/api";
import { Redirect } from "expo-router";
import type { ReactNode } from "react";

import { LoadingScreen } from "@/components/ui/loading-screen";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@/lib/convex";

import { AUTH_REQUIRED } from "./config";

/** The route a gated, unauthenticated user is sent to. */
const SIGN_IN_HREF = "/login";
/** Where a signed-in user with a pending deletion is sent. */
const RESTORE_HREF = "/restore-account";

interface AuthGateProps {
  children: ReactNode;
  /**
   * Whether this boundary requires authentication.
   *
   * Defaults to the global `AUTH_REQUIRED` flag, so a bare `<AuthGate>`
   * follows the app-wide setting. Pass `required` to force-protect a single
   * screen regardless of the global flag (e.g. `<AuthGate required>`); pass
   * `required={false}` to explicitly opt a screen out of a globally-gated app.
   */
  required?: boolean;
}

/**
 * Optional auth boundary.
 *
 * - Signed-in + account pending deletion → redirects to the restore screen,
 *   regardless of `required`, so a soft-deleted user can't slip past into the
 *   app. The restore route lives outside this gate, so there's no loop.
 * - Gate inactive (`required` is false) → renders children unconditionally;
 *   logged-out apps work out of the box.
 * - Gate active + session still loading → shows a loader (no flash of redirect
 *   before the session resolves).
 * - Gate active + authenticated → renders children.
 * - Gate active + unauthenticated → redirects to the sign-in route.
 */
export function AuthGate({
  children,
  required = AUTH_REQUIRED,
}: AuthGateProps) {
  const { data: session, isPending } = authClient.useSession();
  // `getMe` is an optional-auth query: it resolves to null when there's no
  // session, so this hook is safe to call unconditionally. `undefined` means
  // still loading.
  const me = useQuery(api.users.getMe);

  const hasSession = !!session?.session;

  // Soft-delete check runs for any signed-in user, even in a default-open app:
  // a user mid-deletion should always land on restore. Wait for getMe to
  // resolve before deciding so we don't flash the app then bounce.
  if (hasSession) {
    if (me === undefined) {
      return <GateLoader />;
    }
    if (me?.deletedAt) {
      return <Redirect href={RESTORE_HREF} />;
    }
  }

  if (!required) {
    return <>{children}</>;
  }

  if (isPending) {
    return <GateLoader />;
  }

  if (!hasSession) {
    return <Redirect href={SIGN_IN_HREF} />;
  }

  return <>{children}</>;
}

function GateLoader() {
  return <LoadingScreen testID="auth-gate-loading" />;
}
