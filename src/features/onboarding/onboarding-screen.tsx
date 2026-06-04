import Env from "env";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AnimatedListItem,
  Button,
  colors,
  FocusAwareStatusBar,
  Image,
  Text,
  View,
} from "@/components/ui";
import { Icon, type IconName, Surface } from "@/components/ui/native";
import { impact } from "@/lib/haptics";
import { useIsFirstTime } from "@/lib/hooks";
import { type TxKeyPath, translate } from "@/lib/i18n";

const LOGO = require("@/assets/images/icon.png");

const FEATURES: { icon: IconName; tx: TxKeyPath }[] = [
  { icon: "bolt", tx: "onboarding.feature_production" },
  { icon: "sparkles", tx: "onboarding.feature_experience" },
  { icon: "shield", tx: "onboarding.feature_minimal" },
];

export function OnboardingScreen() {
  const [, setIsFirstTime] = useIsFirstTime();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const start = () => {
    impact("medium");
    setIsFirstTime(false);
    router.replace("/");
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <FocusAwareStatusBar />

      <View className="w-full max-w-sm flex-1 justify-between self-center px-6 py-4">
        <View className="flex-1 justify-center">
          <AnimatedListItem className="items-center" index={0}>
            <Image
              accessibilityIgnoresInvertColors
              className="mb-6 h-16 w-16 rounded-2xl"
              source={LOGO}
            />
            <Text className="font-semibold text-neutral-400 text-sm uppercase tracking-widest dark:text-neutral-500">
              {Env.EXPO_PUBLIC_NAME}
            </Text>
            <Text className="mt-3 text-center font-bold text-4xl">
              {translate("onboarding.title")}
            </Text>
            <Text className="mt-4 text-center text-base text-neutral-500 dark:text-neutral-400">
              {translate("onboarding.subtitle")}
            </Text>
          </AnimatedListItem>

          <View className="mt-12 gap-3">
            {FEATURES.map((feature, index) => (
              <AnimatedListItem index={index + 1} key={feature.icon}>
                <Surface className="flex-row items-center p-4">
                  <View className="mr-4 h-11 w-11 items-center justify-center rounded-full bg-primary-100 dark:bg-neutral-700">
                    <Icon
                      color={colors.primary[500]}
                      name={feature.icon}
                      size={22}
                    />
                  </View>
                  <Text className="flex-1 font-medium text-base">
                    {translate(feature.tx)}
                  </Text>
                </Surface>
              </AnimatedListItem>
            ))}
          </View>
        </View>

        <Button
          className="mt-8 w-full"
          label={translate("onboarding.get_started")}
          onPress={start}
          size="lg"
          testID="onboarding-get-started"
        />
      </View>
    </View>
  );
}
