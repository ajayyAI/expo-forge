import { api } from "convex/_generated/api";
import { useRouter } from "expo-router";

import { Image, PressableScale, Text, View } from "@/components/ui";
import { ArrowRight } from "@/components/ui/icons";
import { useQuery } from "@/lib/convex";
import { translate } from "@/lib/i18n";

import { resolveAvatarSource } from "../avatar";

/**
 * Logged-in user header for the settings screen. Shows the avatar, name, and
 * email and routes to the profile editor. When logged out (the app's default),
 * it degrades to a "Sign in" row that routes to login. This is the one Convex
 * touch point outside the auth feature's own screens, kept to just this header.
 */
export function SettingsUserHeader() {
  const router = useRouter();
  const user = useQuery(api.users.getMe);

  // Session still resolving: render nothing rather than flash a sign-in row.
  if (user === undefined) {
    return null;
  }

  if (user === null) {
    return (
      <PressableScale
        accessibilityRole="button"
        className="mb-2 flex-row items-center justify-between rounded-md border border-neutral-200 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-800"
        haptic={false}
        onPress={() => router.push("/login")}
        testID="settings-signin"
      >
        <Text className="font-semibold text-base">
          {translate("profile.sign_in_prompt")}
        </Text>
        <ArrowRight />
      </PressableScale>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      className="mb-2 flex-row items-center rounded-md border border-neutral-200 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800"
      haptic={false}
      onPress={() => router.push("/profile")}
      testID="settings-user-header"
    >
      <Image
        className="h-12 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700"
        contentFit="cover"
        source={resolveAvatarSource(user)}
      />
      <View className="flex-1 px-3">
        <Text className="font-semibold text-base" numberOfLines={1}>
          {user.name}
        </Text>
        <Text className="text-neutral-500 text-sm" numberOfLines={1}>
          {user.email}
        </Text>
      </View>
      <ArrowRight />
    </PressableScale>
  );
}
