import type { SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import {
  DEFAULT_ICON_SIZE,
  ICON_MAP,
  type IconProps,
  useDefaultIconColor,
} from "./icon-map";

/**
 * iOS Icon — renders a native SF Symbol via `expo-symbols`.
 *
 * `expo-symbols` is iOS-only, so this import lives exclusively in a `.ios.tsx`
 * file and never reaches the Android or web bundle.
 */
export function Icon({
  name,
  size = DEFAULT_ICON_SIZE,
  color,
  testID,
}: IconProps) {
  const defaultColor = useDefaultIconColor();
  return (
    <SymbolView
      name={ICON_MAP[name].sf as SFSymbol}
      resizeMode="scaleAspectFit"
      size={size}
      testID={testID}
      tintColor={color ?? defaultColor}
    />
  );
}
