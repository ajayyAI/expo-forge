import { useMMKVBoolean } from "react-native-mmkv";

import { Switch, Text, View } from "@/components/ui";
import { HAPTICS_ENABLED_KEY, selection } from "@/lib/haptics";
import { translate } from "@/lib/i18n";
import { storage } from "@/lib/storage";

export function HapticsItem() {
  const [enabled, setEnabled] = useMMKVBoolean(HAPTICS_ENABLED_KEY, storage);
  const isOn = enabled ?? true;

  return (
    <View className="flex-1 flex-row items-center justify-between px-4 py-2">
      <Text tx="settings.haptics" />
      <Switch
        accessibilityLabel={translate("settings.haptics")}
        onValueChange={(next) => {
          setEnabled(next);
          if (next) {
            selection();
          }
        }}
        value={isOn}
      />
    </View>
  );
}
