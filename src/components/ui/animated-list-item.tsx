import type * as React from "react";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

interface Props {
  index?: number;
  className?: string;
  testID?: string;
  children: React.ReactNode;
}

export function AnimatedListItem({
  index = 0,
  className,
  testID,
  children,
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      className={className}
      entering={
        reduceMotion
          ? undefined
          : FadeInDown.duration(220).delay(Math.min(index, 6) * 50)
      }
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}
