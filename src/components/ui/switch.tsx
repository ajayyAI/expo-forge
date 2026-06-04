import { Switch as RNSwitch, View } from "react-native";
import colors from "@/components/ui/colors";
import { Text } from "./text";

export interface SwitchProps {
  value?: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  label?: string;
  className?: string;
  testID?: string;
}

export function Switch({
  value = false,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  label,
  className,
  testID,
}: SwitchProps) {
  const control = (
    <RNSwitch
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      ios_backgroundColor={colors.neutral[300]}
      onValueChange={onValueChange}
      testID={testID}
      thumbColor={value ? colors.primary[500] : colors.neutral[100]}
      trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
      value={value}
    />
  );

  if (!label) {
    return control;
  }

  return (
    <View
      className={["flex-row items-center justify-between", className]
        .filter(Boolean)
        .join(" ")}
    >
      <Text className="pr-3" testID={testID ? `${testID}-label` : undefined}>
        {label}
      </Text>
      {control}
    </View>
  );
}
