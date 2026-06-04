import { authClient } from "@/lib/auth-client";

/**
 * Sign the current user out. Best-effort and fire-and-forget: the session gate
 * reacts to the cleared session (redirect to login when `AUTH_REQUIRED`,
 * otherwise the user stays on the now-logged-out screen). Lives in the auth
 * feature so consumer screens (e.g. settings) can sign out without importing
 * `authClient` directly — keeping the Better Auth surface excisable.
 */
export function signOut(): void {
  authClient.signOut().catch(() => {
    // Best-effort; the gate redirects once session state clears.
  });
}
