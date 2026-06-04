import type * as React from "react";
import { useImperativeHandle } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { twMerge } from "tailwind-merge";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface Props {
  initialProgress?: number;
  className?: string;
}

export interface ProgressBarRef {
  setProgress: (value: number) => void;
}

export function ProgressBar({
  ref,
  initialProgress = 0,
  className = "",
}: Props & { ref?: React.RefObject<ProgressBarRef | null> }) {
  const progress = useSharedValue<number>(initialProgress);
  const reduceMotion = useReducedMotion();
  useImperativeHandle(ref, () => {
    return {
      setProgress: (value: number) => {
        progress.value = reduceMotion
          ? value
          : withTiming(value, {
              duration: 250,
              easing: Easing.inOut(Easing.quad),
            });
      },
    };
  }, [progress, reduceMotion]);

  const style = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`,
      height: 2,
    };
  });
  return (
    <View className={twMerge("bg-neutral-200 dark:bg-charcoal-800", className)}>
      <Animated.View className="bg-foreground" style={style} />
    </View>
  );
}
