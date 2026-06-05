import type * as React from "react";
import { PressableScale, Text, View } from "@/components/ui";
import { ArrowRight } from "@/components/ui/icons";
import type { TxKeyPath } from "@/lib/i18n";

interface ItemProps {
  text: TxKeyPath;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}

export function SettingsItem({ text, value, icon, onPress }: ItemProps) {
  const isPressable = onPress !== undefined;
  return (
    <PressableScale
      accessibilityRole="button"
      className="min-h-12 flex-1 flex-row items-center justify-between px-4 py-3"
      haptic={isPressable}
      onPress={onPress}
      style={{ pointerEvents: isPressable ? "auto" : "none" }}
    >
      <View className="flex-row items-center">
        {icon && <View className="pr-2">{icon}</View>}
        <Text tx={text} />
      </View>
      <View className="flex-row items-center">
        <Text className="text-neutral-600 dark:text-white">{value}</Text>
        {isPressable && (
          <View className="pl-2">
            <ArrowRight />
          </View>
        )}
      </View>
    </PressableScale>
  );
}
