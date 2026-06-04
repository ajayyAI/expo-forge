import { api } from "convex/_generated/api";
import { useRouter } from "expo-router";

import { PressableScale, Text, View } from "@/components/ui";
import { ArrowRight } from "@/components/ui/icons";
import { Surface } from "@/components/ui/native";
import { useQuery } from "@/lib/convex";
import { translate } from "@/lib/i18n";

/**
 * Home-screen auth seam. The home feature stays free of any auth/Convex import;
 * this component owns the one getMe touch point and degrades to a logged-out
 * call-to-action when the backend is off (the app's default).
 */
export function HomeGreeting() {
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
        className="mb-6"
        haptic={false}
        onPress={() => router.push("/login")}
        testID="home-signin"
      >
        <Surface className="flex-row items-center justify-between p-4">
          <View className="flex-1 pr-3">
            <Text className="font-semibold text-base">
              {translate("home.greeting.signed_out_title")}
            </Text>
            <Text className="text-neutral-500 text-sm dark:text-neutral-400">
              {translate("home.greeting.signed_out_subtitle")}
            </Text>
          </View>
          <ArrowRight />
        </Surface>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      className="mb-6"
      haptic={false}
      onPress={() => router.push("/profile")}
      testID="home-greeting"
    >
      <Surface className="flex-row items-center justify-between p-4">
        <View className="flex-1 pr-3">
          <Text className="font-semibold text-base" numberOfLines={1}>
            {translate("home.greeting.signed_in_title", { name: user.name })}
          </Text>
          <Text className="text-neutral-500 text-sm dark:text-neutral-400">
            {translate("home.greeting.signed_in_subtitle")}
          </Text>
        </View>
        <ArrowRight />
      </Surface>
    </PressableScale>
  );
}
