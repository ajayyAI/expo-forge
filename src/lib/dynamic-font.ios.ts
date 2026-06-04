import { font } from "@expo/ui/swift-ui/modifiers";
import { useCallback } from "react";
import { useWindowDimensions } from "react-native";
import type {
  DynamicFontFn,
  FontParams,
  FontWeight,
} from "./dynamic-font-types";

/**
 * Dynamic Type helper for `@expo/ui` SwiftUI views (iOS).
 *
 * SwiftUI `Text` carries Dynamic Type automatically, but a fixed `size` passed
 * to the `font(...)` modifier does not scale. This hook multiplies the size by
 * the device `fontScale` and resolves a sensible app font family from the
 * weight, so custom-font SwiftUI text still respects the accessibility slider.
 *
 * The `@expo/ui/swift-ui/modifiers#font` VALUE import lives only in this
 * `.ios.ts` file. That barrel runs `requireNativeModule('ExpoUI')` at load, so
 * keeping it iOS-only means Metro never bundles the native import on web /
 * Android — the non-iOS `dynamic-font.ts` fallback has the identical signature
 * but no `@expo/ui` import.
 *
 * Fonts map to the Inter family bundled by this template — change the map to
 * match your own bundled fonts.
 */
const INTER_BY_WEIGHT: Record<FontWeight, string> = {
  ultraLight: "Inter_400Regular",
  thin: "Inter_400Regular",
  light: "Inter_400Regular",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  heavy: "Inter_700Bold",
  black: "Inter_700Bold",
};

function resolveFamily(weight: FontWeight | undefined): string {
  return INTER_BY_WEIGHT[weight ?? "regular"];
}

export function useDynamicFont(): DynamicFontFn {
  const { fontScale } = useWindowDimensions();
  return useCallback(
    (params: FontParams) => {
      const family = params.family ?? resolveFamily(params.weight);
      const size = params.size == null ? params.size : params.size * fontScale;
      return font({ ...params, family, size });
    },
    [fontScale]
  );
}
