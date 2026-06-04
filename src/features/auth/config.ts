/**
 * Auth module configuration.
 *
 * Auth is an OPTIONAL module: by default the app boots to content while
 * logged-out. `AUTH_REQUIRED` is the global opt-in — flip it on to gate the
 * whole app behind sign-in. Individual screens can still force-protect
 * themselves with `<AuthGate required>` regardless of this flag.
 *
 * Driven by the public env var `EXPO_PUBLIC_AUTH_REQUIRED`, which is declared
 * and read in the root env contract.
 *
 * Coercion: "true" or "1" → required; anything else or absent → not required.
 */

import Env, { readPublicBooleanFlag } from "env";

function readAuthRequired(): boolean {
  return readPublicBooleanFlag(Env.EXPO_PUBLIC_AUTH_REQUIRED);
}

/** True when the whole app should be gated behind sign-in. Default: false. */
export const AUTH_REQUIRED = readAuthRequired();
