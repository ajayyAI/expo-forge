import { BlurView } from "expo-blur";
import { View } from "react-native";
import { useResolveClassNames, useUniwind } from "uniwind";
import {
  SURFACE_BASE_CLASS,
  SURFACE_CARD_CLASS,
  type SurfaceProps,
} from "./surface-types";

// Elevated card by default; real frosted blur only when caller supplies a blurTarget,
// because Dimezis BlurView requires an explicit BlurTargetView wrapping the content.
export function Surface({
  className,
  children,
  style,
  intensity = 50,
  blurTarget,
  ...props
}: SurfaceProps) {
  const { theme } = useUniwind();
  const blurStyle = useResolveClassNames(
    [SURFACE_BASE_CLASS, className].filter(Boolean).join(" ")
  );

  if (blurTarget) {
    return (
      <BlurView
        blurMethod="dimezisBlurViewSdk31Plus"
        blurTarget={blurTarget}
        intensity={intensity}
        style={[{ elevation: 3 }, blurStyle, style]}
        tint={theme === "dark" ? "dark" : "light"}
        {...props}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      className={[SURFACE_CARD_CLASS, className].filter(Boolean).join(" ")}
      style={[{ elevation: 3 }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
