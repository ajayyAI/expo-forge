import Env from "env";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

import { authClient } from "@/lib/auth-client";
import { translate } from "@/lib/i18n";

/**
 * Social sign-in helpers.
 *
 * Each returns an error message string on failure (or undefined on success),
 * so the caller can surface it inline without a try/catch at the call site.
 * Native providers exchange a provider-issued id token via
 * `signIn.social({ provider, idToken })`; on web the Expo client converts the
 * same call (no id token) into the browser redirect flow.
 *
 * Google's native module is imported lazily so web bundles — and the gates that
 * hide the button off-platform — don't pull in native-only code.
 * expo-apple-authentication, by contrast, binds through
 * `requireOptionalNativeModule`, so importing it is web-safe (it resolves to a
 * stub whose methods throw only when called). It's imported statically on
 * purpose; the iOS-gated button keeps `signInAsync` off web.
 */

function isUserCancellation(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("cancel") ||
    lower.includes("canceled") ||
    lower.includes("cancelled")
  );
}

export async function signInWithGoogle(): Promise<string | undefined> {
  if (Platform.OS === "web") {
    const { error } = await authClient.signIn.social({ provider: "google" });
    return error?.message ?? undefined;
  }

  try {
    const { GoogleSignin, isSuccessResponse } = await import(
      "@react-native-google-signin/google-signin"
    );
    GoogleSignin.configure({
      webClientId: Env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: Env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (!(isSuccessResponse(response) && response.data.idToken)) {
      // User dismissed the picker; treat as a silent no-op.
      return undefined;
    }
    const { error } = await authClient.signIn.social({
      provider: "google",
      idToken: { token: response.data.idToken },
    });
    return error?.message ?? undefined;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isUserCancellation(message)) return undefined;
    return translate("auth.errors.google_failed");
  }
}

export async function signInWithApple(): Promise<string | undefined> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return translate("auth.errors.apple_failed");
    }
    const { error } = await authClient.signIn.social({
      provider: "apple",
      idToken: { token: credential.identityToken },
    });
    return error?.message ?? undefined;
  } catch (e) {
    // The Apple sheet rejects with code ERR_REQUEST_CANCELED on dismissal.
    const code = (e as { code?: string }).code;
    if (code === "ERR_REQUEST_CANCELED") return undefined;
    return translate("auth.errors.apple_failed");
  }
}
