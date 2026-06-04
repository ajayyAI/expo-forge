import Env from "env";
import { useRouter } from "expo-router";
import { useUniwind } from "uniwind";

import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from "@/components/ui";
import { Github, Rate, Share, Support, Website } from "@/components/ui/icons";
import { BiometricLockItem } from "@/features/auth/biometric-lock";
import { SettingsUserHeader } from "@/features/auth/profile/components/settings-user-header";
import { signOut } from "@/features/auth/sign-out";
import { PURCHASES_ENABLED } from "@/features/purchases";
import { authClient } from "@/lib/auth-client";
import { translate } from "@/lib/i18n";
import { ANDROID_TAB_BAR_INSET } from "@/lib/tab-bar";
import {
  contactSupport,
  openGithub,
  openWebsite,
  rateApp,
  shareApp,
} from "./actions";
import { HapticsItem } from "./components/haptics-item";
import { LanguageItem } from "./components/language-item";
import { SettingsContainer } from "./components/settings-container";
import { SettingsItem } from "./components/settings-item";
import { ThemeItem } from "./components/theme-item";
import { getVisibleSettingsLinks, isSupportVisible } from "./links";

export function SettingsScreen() {
  const router = useRouter();
  const { theme } = useUniwind();
  const iconColor =
    theme === "dark" ? colors.neutral[400] : colors.neutral[500];
  const links = getVisibleSettingsLinks();
  const { data: session } = authClient.useSession();
  const hasSession = !!session?.session;
  return (
    <>
      <FocusAwareStatusBar />

      <ScrollView
        contentContainerStyle={{ paddingBottom: ANDROID_TAB_BAR_INSET }}
      >
        <View className="flex-1 px-4 pt-16">
          <Text className="mb-4 font-bold text-xl">
            {translate("settings.title")}
          </Text>
          <SettingsUserHeader />
          <SettingsContainer title="settings.generale">
            <LanguageItem />
            <ThemeItem />
            <HapticsItem />
            {hasSession ? (
              <SettingsItem
                onPress={() => router.push("/sessions")}
                text="settings.active_sessions"
              />
            ) : null}
            {PURCHASES_ENABLED ? (
              <SettingsItem
                onPress={() => router.push("/paywall")}
                text="settings.upgrade"
              />
            ) : null}
            <BiometricLockItem />
          </SettingsContainer>

          <SettingsContainer title="settings.about">
            <SettingsItem
              text="settings.app_name"
              value={Env.EXPO_PUBLIC_NAME}
            />
            <SettingsItem
              text="settings.version"
              value={Env.EXPO_PUBLIC_VERSION}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.support_us">
            <SettingsItem
              icon={<Share color={iconColor} />}
              onPress={shareApp}
              text="settings.share"
            />
            <SettingsItem
              icon={<Rate color={iconColor} />}
              onPress={rateApp}
              text="settings.rate"
            />
            {isSupportVisible() && (
              <SettingsItem
                icon={<Support color={iconColor} />}
                onPress={contactSupport}
                text="settings.support"
              />
            )}
          </SettingsContainer>

          <SettingsContainer title="settings.links">
            <SettingsItem
              onPress={() => router.push("/privacy")}
              text="settings.privacy"
            />
            <SettingsItem
              onPress={() => router.push("/terms")}
              text="settings.terms"
            />
            {links.includes("github") && (
              <SettingsItem
                icon={<Github color={iconColor} />}
                onPress={openGithub}
                text="settings.github"
              />
            )}
            {links.includes("website") && (
              <SettingsItem
                icon={<Website color={iconColor} />}
                onPress={openWebsite}
                text="settings.website"
              />
            )}
          </SettingsContainer>

          {hasSession ? (
            <View className="my-8">
              <SettingsContainer>
                <SettingsItem onPress={signOut} text="settings.logout" />
              </SettingsContainer>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
