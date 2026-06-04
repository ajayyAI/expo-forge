import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/**
 * Persistent top strip shown while the device is offline. Sits above app
 * content and clears the status bar via the top safe-area inset. Renders
 * nothing when online, so it stays out of the layout the rest of the time.
 * `accessibilityRole="alert"` makes screen readers announce going offline.
 */
export function OfflineBanner() {
  const { isOffline } = useOnlineStatus();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
      className="absolute inset-x-0 top-0 z-50 items-center bg-amber-500 px-4 pb-2 dark:bg-amber-600"
      entering={reduceMotion ? undefined : FadeInUp.duration(200)}
      exiting={reduceMotion ? undefined : FadeOut.duration(150)}
      style={{ paddingTop: insets.top + 8 }}
      testID="offline-banner"
    >
      <Text
        className="text-center font-medium text-amber-950 dark:text-amber-50"
        tx="network.offline"
      />
    </Animated.View>
  );
}
