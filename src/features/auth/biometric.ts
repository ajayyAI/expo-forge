import * as LocalAuthentication from "expo-local-authentication";

/**
 * Gate a sensitive action behind a biometric (Face ID / Touch ID) check.
 *
 * Degrades open: when the device has no biometric hardware or nothing is
 * enrolled (also the case on web), there is nothing to prompt with, so the
 * caller proceeds on the strength of whatever confirmation preceded this
 * (e.g. an `Alert`). We never block an action the user is entitled to take
 * just because biometrics are unavailable.
 *
 * Returns:
 * - `true`  → unavailable-so-skipped, OR the prompt succeeded.
 * - `false` → a prompt was shown and the user failed or cancelled it.
 *
 * Fail-safe contract: a thrown error (hardware/enrollment check or the prompt
 * itself rejecting) is NOT swallowed — it propagates to the caller, which MUST
 * treat a rejection as an abort. Never `catch` this into a "proceed" path, or a
 * sensitive action could run when the biometric step never actually confirmed.
 */
export async function confirmWithBiometrics(
  promptMessage: string
): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  if (!(hasHardware && isEnrolled)) {
    return true;
  }

  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  return result.success;
}
