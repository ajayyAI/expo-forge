import { Tabs } from "expo-router";

import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  Style as StyleIcon,
} from "@/components/ui/icons";
import { AuthGate } from "@/features/auth/auth-gate";
import { translate } from "@/lib/i18n";

// Web fallback for the native tab bar. `NativeTabs` (in `_layout.tsx`) delegates
// to UIKit / Material on device; the web build has no native tab bar, so it
// keeps the JavaScript `<Tabs>` here.
export default function TabLayout() {
  return (
    <AuthGate>
      <Tabs>
        <Tabs.Screen
          name="index"
          options={{
            title: translate("home.tab"),
            tabBarIcon: ({ color }) => <HomeIcon color={color} />,
            tabBarButtonTestID: "home-tab",
          }}
        />

        <Tabs.Screen
          name="style"
          options={{
            title: translate("style.tab"),
            headerShown: false,
            tabBarIcon: ({ color }) => <StyleIcon color={color} />,
            tabBarButtonTestID: "style-tab",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: translate("settings.title"),
            headerShown: false,
            tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
            tabBarButtonTestID: "settings-tab",
          }}
        />
      </Tabs>
    </AuthGate>
  );
}
