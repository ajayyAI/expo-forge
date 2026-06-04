import { useRouter } from "expo-router";

import {
  AnimatedListItem,
  colors,
  FocusAwareStatusBar,
  PressableScale,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "@/components/ui";
import {
  ArrowRight,
  Settings as SettingsIcon,
  Style as StyleIcon,
} from "@/components/ui/icons";
import { Surface } from "@/components/ui/native";
import { HomeGreeting } from "@/features/auth/home-greeting";
import { translate } from "@/lib/i18n";
import { ANDROID_TAB_BAR_INSET } from "@/lib/tab-bar";

interface QuickStart {
  testID: string;
  icon: React.ReactNode;
  titleKey: Parameters<typeof translate>[0];
  descriptionKey: Parameters<typeof translate>[0];
  href: "/style" | "/settings";
}

export function HomeScreen() {
  const router = useRouter();

  const quickStarts: QuickStart[] = [
    {
      testID: "home-card-style",
      icon: <StyleIcon color={colors.primary[500]} />,
      titleKey: "home.cards.style.title",
      descriptionKey: "home.cards.style.description",
      href: "/style",
    },
    {
      testID: "home-card-settings",
      icon: <SettingsIcon color={colors.primary[500]} />,
      titleKey: "home.cards.settings.title",
      descriptionKey: "home.cards.settings.description",
      href: "/settings",
    },
  ];

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingBottom: ANDROID_TAB_BAR_INSET }}
      >
        <SafeAreaView className="flex-1">
          <View className="pt-12 pb-8">
            <Text className="font-bold text-3xl">
              {translate("home.hero.title")}
            </Text>
            <Text className="mt-2 text-base text-neutral-500 dark:text-neutral-400">
              {translate("home.hero.tagline")}
            </Text>
          </View>

          <HomeGreeting />

          <Text className="mb-3 font-semibold text-neutral-500 text-sm uppercase dark:text-neutral-400">
            {translate("home.quick_start")}
          </Text>

          {quickStarts.map((card, index) => (
            <AnimatedListItem index={index} key={card.testID}>
              <PressableScale
                accessibilityRole="button"
                className="mb-3"
                haptic={false}
                onPress={() => router.push(card.href)}
                testID={card.testID}
              >
                <Surface className="flex-row items-center p-4">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-neutral-700">
                    {card.icon}
                  </View>
                  <View className="flex-1 pr-3">
                    <Text className="font-semibold text-base">
                      {translate(card.titleKey)}
                    </Text>
                    <Text className="text-neutral-500 text-sm dark:text-neutral-400">
                      {translate(card.descriptionKey)}
                    </Text>
                  </View>
                  <ArrowRight />
                </Surface>
              </PressableScale>
            </AnimatedListItem>
          ))}
        </SafeAreaView>
      </ScrollView>
    </>
  );
}
