import type { Ref } from "react";
import type { PressableProps, View } from "react-native";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { selection } from "@/lib/haptics";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

// Light, well-damped spring: a quick dip with no visible overshoot.
const SPRING = { damping: 15, stiffness: 400, mass: 0.5 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  pressedScale?: number;
  haptic?: boolean;
  ref?: Ref<View>;
};

/**
 * Pressable that springs down on touch and ticks a selection haptic, so every
 * tap feels like a physical object. Scale is suppressed under reduced motion.
 */
export function PressableScale({
  pressedScale = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  style,
  children,
  ref,
  ...props
}: Props) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        if (!reduceMotion) {
          scale.value = withSpring(pressedScale, SPRING);
        }
        if (haptic) {
          selection();
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduceMotion) {
          scale.value = withSpring(1, SPRING);
        }
        onPressOut?.(e);
      }}
      ref={ref}
      style={
        typeof style === "function"
          ? (state) => [animatedStyle, style(state)]
          : [animatedStyle, style]
      }
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
