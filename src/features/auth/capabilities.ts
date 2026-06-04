/**
 * Auth capability checks.
 *
 * Decides which sign-in methods the UI may surface, given the configured env
 * and the running platform. Buttons that would fail at submit (an OAuth
 * provider with no client id, Apple Sign In off-iOS) stay hidden.
 *
 * Email OTP is the passwordless default and always available. Email + password
 * is opt-in via `EXPO_PUBLIC_PASSWORD_AUTH_ENABLED`. Social providers are
 * opt-in via public env vars:
 *  - Google needs the web client id (web) or the platform's native client id.
 *  - Apple is iOS-only and gated on `EXPO_PUBLIC_APPLE_AUTH_ENABLED`, since the
 *    client can't read the server-side Apple credentials.
 *
 * Public env values are read through the root env contract so capability rules
 * stay auditable in one place.
 */

import Env, { readPublicBooleanFlag } from "env";
import { Platform } from "react-native";

export type AuthMethod = "email" | "emailOTP" | "google" | "apple";

function isGoogleAvailable(): boolean {
  switch (Platform.OS) {
    case "web":
      // Web verifies the id token against the web client id.
      return !!Env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    case "ios":
      // Native sign-in returns an id token issued for the platform client id.
      return !!Env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    case "android":
      return !!Env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    default:
      return false;
  }
}

function isAppleAvailable(): boolean {
  if (Platform.OS !== "ios") {
    return false;
  }
  return readPublicBooleanFlag(Env.EXPO_PUBLIC_APPLE_AUTH_ENABLED);
}

/** Whether the email + password path is opted in for this deployment. */
export function isPasswordAuthEnabled(): boolean {
  return readPublicBooleanFlag(Env.EXPO_PUBLIC_PASSWORD_AUTH_ENABLED);
}

/**
 * The set of auth methods the UI should offer in the current environment.
 */
export function getAvailableAuthMethods(): AuthMethod[] {
  const methods: AuthMethod[] = ["emailOTP"];
  if (isPasswordAuthEnabled()) {
    methods.push("email");
  }
  if (isGoogleAvailable()) {
    methods.push("google");
  }
  if (isAppleAvailable()) {
    methods.push("apple");
  }
  return methods;
}

/**
 * App Store Guideline 4.8: an iOS app offering Google sign-in must also offer
 * Sign in with Apple. Returns a developer warning when that pairing is
 * misconfigured for the current platform/env, or `null` when compliant.
 */
export function getAppStoreComplianceWarning(): string | null {
  if (Platform.OS === "ios" && isGoogleAvailable() && !isAppleAvailable()) {
    return "Offering Google sign-in on iOS requires Sign in with Apple (App Store Guideline 4.8). Set EXPO_PUBLIC_APPLE_AUTH_ENABLED=true and configure Apple before submitting.";
  }
  return null;
}
