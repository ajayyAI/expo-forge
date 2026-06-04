import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text } from "@/components/ui";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { useOtaUpdate } from "@/lib/hooks/use-ota-update";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { translate } from "@/lib/i18n";

/**
 * Top strip prompting the user to apply a downloaded OTA update by reloading.
 * Mirrors the offline banner's layout (absolute top, top safe-area inset,
 * `accessibilityRole="alert"`) but is informational-colored and actionable.
 * Renders nothing unless an update has been fetched and is ready to apply.
 * Offline takes visual priority; a staged update can't be applied without
 * connectivity anyway, so we suppress this banner while offline.
 */
export function UpdateBanner() {
  const { isUpdateReady, reload } = useOtaUpdate();
  const { isOffline } = useOnlineStatus();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  if (!isUpdateReady || isOffline) {
    return null;
  }

  return (
    <Animated.View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      className="absolute inset-x-0 top-0 z-50 flex-row items-center justify-between gap-3 bg-primary-600 px-4 pb-2"
      entering={reduceMotion ? undefined : FadeInUp.duration(200)}
      exiting={reduceMotion ? undefined : FadeOut.duration(150)}
      style={{ paddingTop: insets.top + 8 }}
      testID="update-banner"
    >
      <Text className="flex-1 font-medium text-white" tx="updates.available" />
      <Button
        className="my-0 h-8 bg-white px-4"
        fullWidth={false}
        label={translate("updates.reload")}
        onPress={reload}
        testID="update-banner-reload"
        textClassName="text-primary-600"
      />
    </Animated.View>
  );
}
