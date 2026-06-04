import { useState } from "react";
import { Text, View } from "@/components/ui";
import colors from "@/components/ui/colors";
import { Icon, SegmentedControl, Surface } from "@/components/ui/native";
import { useSymbolSize } from "@/lib/dynamic-symbol-size";
import { Title } from "./title";

const SEGMENTS = ["Day", "Week", "Month"] as const;

/**
 * Demonstrates the platform-gated native-polish tier:
 * - Icon renders SF Symbols on iOS, Material icons on Android/web.
 * - Surface is liquid glass on iOS, blur on Android, a card on web.
 * - SegmentedControl is native on iOS/Android, RN fallback on web.
 */
export function NativePolish() {
  const [range, setRange] = useState<(typeof SEGMENTS)[number]>("Day");
  const symbolSize = useSymbolSize();

  return (
    <>
      <Title text="Native Polish" />
      <View className="gap-4 pb-4">
        <View className="flex-row items-center gap-4">
          <Icon color={colors.primary[600]} name="home" size={symbolSize(24)} />
          <Icon color={colors.primary[600]} name="bell" size={symbolSize(24)} />
          <Icon
            color={colors.primary[600]}
            name="heart"
            size={symbolSize(24)}
          />
          <Icon
            color={colors.primary[600]}
            name="settings"
            size={symbolSize(24)}
          />
        </View>

        <Surface className="p-4">
          <Text className="text-foreground">
            Surface: liquid glass (iOS) · blur (Android) · card (web)
          </Text>
        </Surface>

        <SegmentedControl
          onChange={setRange}
          options={SEGMENTS}
          value={range}
        />
        <Text className="text-muted-foreground">Selected range: {range}</Text>
      </View>
    </>
  );
}
