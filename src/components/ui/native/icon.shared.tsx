import { MaterialIcons } from "@expo/vector-icons";
import {
  DEFAULT_ICON_SIZE,
  ICON_MAP,
  type IconProps,
  useDefaultIconColor,
} from "./icon-map";

/**
 * Material-icon implementation of Icon, shared by Android and web. Uses
 * `@expo/vector-icons` (a font-glyph renderer that runs everywhere), so it has
 * no native-only dependency and is safe in any bundle.
 */
export function MaterialIcon({
  name,
  size = DEFAULT_ICON_SIZE,
  color,
  testID,
}: IconProps) {
  const defaultColor = useDefaultIconColor();
  return (
    <MaterialIcons
      color={color ?? defaultColor}
      name={ICON_MAP[name].material}
      size={size}
      testID={testID}
    />
  );
}
