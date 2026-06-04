import Env, { readOptionalPublicString } from "env";
import { Platform } from "react-native";

/**
 * Env-derived RevenueCat gate, mirroring src/lib/backend-config.ts. The key is
 * platform-specific (separate Apple/Google publishable keys); web has no native
 * store, so it resolves to undefined and the feature stays inert.
 */
export const REVENUECAT_API_KEY = Platform.select({
  ios: readOptionalPublicString(Env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY),
  android: readOptionalPublicString(Env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY),
  default: undefined,
});

export const PRO_ENTITLEMENT_ID =
  readOptionalPublicString(Env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID) ?? "pro";

/**
 * In-app purchases run only on a native platform with a configured key. Web is
 * excluded outright (the native SDK has no web purchase flow here), so a fresh
 * clone with an empty .env keeps the whole feature inert.
 */
export const PURCHASES_ENABLED =
  Platform.OS !== "web" && Boolean(REVENUECAT_API_KEY);
