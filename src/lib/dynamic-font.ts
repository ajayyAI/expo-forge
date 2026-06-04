import { useCallback } from "react";
import type { DynamicFontFn } from "./dynamic-font-types";

/**
 * Non-iOS fallback for the Dynamic Type helper (web / Android / any other).
 *
 * Metro picks `dynamic-font.ios.ts` on iOS (the real SwiftUI implementation)
 * and this file everywhere else. It deliberately imports no native SwiftUI
 * modifier barrel — that barrel runs `requireNativeModule('ExpoUI')` at load
 * and would crash the web / Android bundle. SwiftUI views are iOS-only, so off
 * iOS the modifier is meaningless: the hook returns a passthrough that yields
 * `undefined` (a no-op font modifier), keeping cross-platform callers
 * compiling and running.
 *
 * Shares the exact signature ({@link DynamicFontFn}) with the iOS file so any
 * `@/lib/dynamic-font` consumer is bundle-safe on every platform.
 */
export function useDynamicFont(): DynamicFontFn {
  // No `useWindowDimensions` needed off iOS: there is no SwiftUI font modifier
  // to scale, so we return a stable no-op.
  return useCallback(() => undefined, []);
}
