import type { NativeIntent } from "expo-router";

import { resolveDeepLink } from "@/lib/deep-link";

/**
 * Turns a tapped custom-scheme or universal link into an in-app route. Every
 * incoming system `path` is attacker-supplied, so it runs through the same
 * `resolveDeepLink` allowlist as notification taps (open-redirect / phishing
 * protection); a rejected link returns `null` so expo-router leaves the current
 * path alone rather than navigating anywhere unexpected. expo-router calls this
 * before matching, on cold start and warm.
 */
export const redirectSystemPath: NativeIntent["redirectSystemPath"] = ({
  path,
}) => {
  const resolved = resolveDeepLink(path);
  if (!resolved) {
    if (__DEV__) {
      console.warn("[native-intent] blocked deep link:", path);
    }
    return null;
  }
  return resolved;
};
