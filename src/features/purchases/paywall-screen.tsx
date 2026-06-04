import { Stack } from "expo-router";
import { useState } from "react";

import {
  FocusAwareStatusBar,
  PressableScale,
  ScrollView,
  showErrorMessage,
  Text,
  View,
} from "@/components/ui";
import { Surface } from "@/components/ui/native";
import { translate } from "@/lib/i18n";
import { captureException } from "@/lib/sentry";
import { UpgradeButton } from "./components/upgrade-button";
import { usePurchases } from "./use-purchases";

export function PaywallScreen() {
  const { isEnabled, isReady, isPro, presentPaywall, restore } = usePurchases();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      captureException(error);
      showErrorMessage(translate("purchases.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: translate("purchases.title") }} />
      <FocusAwareStatusBar />
      <ScrollView
        className="px-4"
        contentContainerClassName="flex-grow py-6"
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text className="text-base text-neutral-500 dark:text-neutral-400">
          {translate("purchases.tagline")}
        </Text>

        {isEnabled ? (
          <View className="mt-6">
            <Surface className="mb-6 p-4">
              <Text className="font-semibold text-neutral-500 text-sm uppercase dark:text-neutral-400">
                {translate("purchases.status_label")}
              </Text>
              <Text className="mt-1 font-semibold text-xl">
                {translate(isPro ? "purchases.pro" : "purchases.free")}
              </Text>
            </Surface>

            {isPro ? (
              <Text className="text-base text-neutral-500 dark:text-neutral-400">
                {translate("purchases.pro_active")}
              </Text>
            ) : (
              <UpgradeButton
                loading={busy || !isReady}
                onPress={() => run(presentPaywall)}
              />
            )}

            <PressableScale
              className="mt-4 self-center py-2"
              onPress={() => run(restore)}
              testID="paywall-restore"
            >
              <Text className="text-neutral-600 underline dark:text-neutral-300">
                {translate("purchases.restore")}
              </Text>
            </PressableScale>
          </View>
        ) : (
          <Surface className="mt-6 p-4" testID="paywall-disabled">
            <Text className="text-base text-neutral-500 dark:text-neutral-400">
              {translate("purchases.not_configured")}
            </Text>
          </Surface>
        )}
      </ScrollView>
    </>
  );
}
