import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useUniwind } from "uniwind";

import colors from "@/components/ui/colors";
import { AuthGate } from "@/features/auth/auth-gate";
import { translate } from "@/lib/i18n";

// Native tab bar: the OS renders it, so iOS 26 gets Liquid Glass and Android
// gets Material 3 for free. Icons are SF Symbol / Material Symbol names (not the
// SVG `@/components/ui/icons` components, which `NativeTabs` can't consume).
// Web has no native tab bar and uses the JavaScript `<Tabs>` in `_layout.web.tsx`.
export default function TabLayout() {
  const { theme } = useUniwind();
  const indicatorColor =
    theme === "dark" ? colors.charcoal[800] : colors.primary[100];
  const rippleColor =
    theme === "dark" ? colors.charcoal[700] : colors.primary[200];

  return (
    <AuthGate>
      <NativeTabs
        indicatorColor={indicatorColor}
        minimizeBehavior="onScrollDown"
        rippleColor={rippleColor}
        tintColor={colors.primary[600]}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            md="home"
            sf={{ default: "house", selected: "house.fill" }}
          />
          <NativeTabs.Trigger.Label>
            {translate("home.tab")}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="style">
          <NativeTabs.Trigger.Icon md="apps" sf="square.grid.2x2" />
          <NativeTabs.Trigger.Label>
            {translate("style.tab")}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon
            md="settings"
            sf={{ default: "gearshape", selected: "gearshape.fill" }}
          />
          <NativeTabs.Trigger.Label>
            {translate("settings.title")}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </AuthGate>
  );
}
