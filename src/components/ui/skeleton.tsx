import { useEffect } from "react";
import type { DimensionValue } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { twMerge } from "tailwind-merge";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface Props {
  width?: DimensionValue;
  height?: DimensionValue;
  className?: string;
  testID?: string;
}

/** Muted placeholder block. The pulse is suppressed under reduced motion. */
export function Skeleton({
  width = "100%",
  height = 16,
  className = "",
  testID,
}: Props) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0.5);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    // Stop the infinite pulse on unmount so it doesn't keep driving the shared
    // value on the UI thread (skeletons churn during list pagination).
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={twMerge(
        "rounded-md bg-neutral-200 dark:bg-charcoal-800",
        className
      )}
      style={[{ width, height }, style]}
      testID={testID}
    />
  );
}
