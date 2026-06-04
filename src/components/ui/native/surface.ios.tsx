import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { View } from "react-native";
import { useResolveClassNames } from "uniwind";
import {
  SURFACE_BASE_CLASS,
  SURFACE_CARD_CLASS,
  type SurfaceProps,
} from "./surface-types";

/**
 * iOS Surface — native liquid glass via `expo-glass-effect`.
 *
 * `expo-glass-effect` is iOS-only and this import lives only in `.ios.tsx`, so
 * it never reaches the Android or web bundle.
 *
 * Liquid glass only exists on iOS 26+. On older iOS (and simulators)
 * `isLiquidGlassAvailable()` returns false and `GlassView` would render as a
 * fully transparent view — leaving content sitting on a see-through box, since
 * `SURFACE_BASE_CLASS` carries no background. When it's unavailable we render a
 * plain card (matching the web `surface.tsx` `bg-card` fallback) instead.
 */
export function Surface({
  className,
  children,
  style,
  intensity: _intensity,
  ...props
}: SurfaceProps) {
  // Same value for the whole process lifetime (it's the OS version), so the
  // branch below never changes between renders — hooks order stays stable.
  const glassAvailable = isLiquidGlassAvailable();
  const resolved = useResolveClassNames(
    [SURFACE_BASE_CLASS, className].filter(Boolean).join(" ")
  );

  if (!glassAvailable) {
    return (
      <View
        className={[SURFACE_CARD_CLASS, className].filter(Boolean).join(" ")}
        style={style}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <GlassView glassEffectStyle="regular" style={[resolved, style]} {...props}>
      {children}
    </GlassView>
  );
}
