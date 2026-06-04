import ExpoSegmentedControl from "@expo/ui/community/segmented-control";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * Cross-platform segmented control with one clean API.
 *
 * Backed by `@expo/ui/community/segmented-control`, which renders a native
 * SwiftUI `Picker` (segmented style) on iOS, a Jetpack Compose
 * `SingleChoiceSegmentedButtonRow` on Android, and a vendored pure-React-Native
 * fallback on web. The web fallback has no native-only imports, so this single
 * file is safe in every bundle — no platform splitting required.
 */
export interface SegmentedControlProps<T extends string = string> {
  /** The selectable option labels, in order. */
  options: readonly T[];
  /** The currently selected option value. */
  value: T;
  /** Called with the newly selected option value. */
  onChange: (value: T) => void;
  /** Disable interaction. */
  enabled?: boolean;
  /** Accent color (Android / web). */
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  enabled = true,
  tintColor,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const selectedIndex = Math.max(0, options.indexOf(value));
  return (
    <ExpoSegmentedControl
      enabled={enabled}
      onValueChange={(next) => onChange(next as T)}
      selectedIndex={selectedIndex}
      style={style}
      testID={testID}
      tintColor={tintColor}
      values={[...options]}
    />
  );
}
