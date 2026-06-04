/**
 * Biometric app-lock configuration.
 *
 * The app-lock is an OPTIONAL, excisable module: when this build flag is off
 * the whole feature is inert (no gate, no settings row). It's a template/build
 * decision distinct from the user's opt-in preference — both must be on for the
 * lock to engage.
 *
 * Driven by the public env var `EXPO_PUBLIC_BIOMETRIC_LOCK`, which is declared
 * and read in the root env contract.
 *
 * Coercion: "true" or "1" → enabled; anything else or absent → disabled.
 */

import Env, { readPublicBooleanFlag } from "env";

function readBiometricLockEnabled(): boolean {
  return readPublicBooleanFlag(Env.EXPO_PUBLIC_BIOMETRIC_LOCK);
}

/** True when the app-lock feature is compiled in. Default: false. */
export const BIOMETRIC_LOCK_ENABLED = readBiometricLockEnabled();
