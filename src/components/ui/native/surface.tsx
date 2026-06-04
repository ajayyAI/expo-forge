import { View } from "react-native";
import { SURFACE_CARD_CLASS, type SurfaceProps } from "./surface-types";

/**
 * Default / web Surface — a plain Uniwind card.
 *
 * Metro picks `surface.ios.tsx` (liquid glass) on iOS and `surface.android.tsx`
 * (blur) on Android; this bare file is the web and any-other-platform fallback.
 * No native-only imports here, so it is always safe in the web bundle.
 */
export function Surface({
  className,
  children,
  intensity: _intensity,
  ...props
}: SurfaceProps) {
  return (
    <View
      className={[SURFACE_CARD_CLASS, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </View>
  );
}
