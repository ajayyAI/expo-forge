import { useCallback, useEffect } from "react";
import type { PressableProps } from "react-native";
import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import colors from "@/components/ui/colors";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

import { Text } from "./text";

const SIZE = 20;

export type RootProps = {
  onChange: (checked: boolean) => void;
  checked?: boolean;
  className?: string;
  accessibilityLabel: string;
} & Omit<PressableProps, "onPress">;

export interface IconProps {
  checked: boolean;
}

export function Root({
  checked = false,
  children,
  onChange,
  disabled,
  className = "",
  ...props
}: RootProps) {
  const handleChange = useCallback(() => {
    onChange(!checked);
  }, [onChange, checked]);

  return (
    <Pressable
      accessibilityState={{ checked }}
      className={`flex-row items-center ${className} ${
        disabled ? "opacity-50" : ""
      }`}
      disabled={disabled}
      onPress={handleChange}
      {...props}
    >
      {children}
    </Pressable>
  );
}

interface LabelProps {
  text: string;
  className?: string;
  testID?: string;
}

function Label({ text, testID, className = "" }: LabelProps) {
  return (
    <Text className={`${className} pl-2`} testID={testID}>
      {text}
    </Text>
  );
}

export function CheckboxIcon({ checked = false }: IconProps) {
  const reduceMotion = useReducedMotion();
  const color = checked ? colors.primary[300] : colors.charcoal[400];
  // `progress` drives the box fill/border; `opacity` reveals the tick. Both ease
  // over 100ms to match the prior timing, or snap when reduced motion is on.
  const progress = useSharedValue(checked ? 1 : 0);
  const opacity = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    const target = checked ? 1 : 0;
    if (reduceMotion) {
      progress.value = target;
      opacity.value = target;
      return;
    }
    progress.value = withTiming(target, { duration: 100 });
    opacity.value = withTiming(target, { duration: 100 });
  }, [checked, reduceMotion, progress, opacity]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ["transparent", color]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.neutral[300], color]
    ),
  }));
  const tickStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className="items-center justify-center rounded-md border-2"
      style={[{ height: SIZE, width: SIZE, borderColor: color }, boxStyle]}
    >
      <Animated.View style={tickStyle}>
        <Svg fill="none" height="24" viewBox="0 0 24 24" width="24">
          <Path
            d="m16.726 7-.64.633c-2.207 2.212-3.878 4.047-5.955 6.158l-2.28-1.928-.69-.584L6 12.66l.683.577 2.928 2.477.633.535.591-.584c2.421-2.426 4.148-4.367 6.532-6.756l.633-.64L16.726 7Z"
            fill={colors.white}
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

function CheckboxRoot({ checked = false, children, ...props }: RootProps) {
  return (
    <Root accessibilityRole="checkbox" checked={checked} {...props}>
      {children}
    </Root>
  );
}

function CheckboxBase({
  checked = false,
  testID,
  label,

  ...props
}: RootProps & { label?: string }) {
  return (
    <CheckboxRoot checked={checked} testID={testID} {...props}>
      <CheckboxIcon checked={checked} />
      {label ? (
        <Label
          className="pr-2"
          testID={testID ? `${testID}-label` : undefined}
          text={label}
        />
      ) : null}
    </CheckboxRoot>
  );
}

export const Checkbox = Object.assign(CheckboxBase, {
  Icon: CheckboxIcon,
  Root: CheckboxRoot,
  Label,
});

export function RadioIcon({ checked = false }: IconProps) {
  const reduceMotion = useReducedMotion();
  const color = checked ? colors.primary[300] : colors.charcoal[400];
  // Border eases over 100ms, the inner dot over 50ms — same timings as before.
  const progress = useSharedValue(checked ? 1 : 0);
  const opacity = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    const target = checked ? 1 : 0;
    if (reduceMotion) {
      progress.value = target;
      opacity.value = target;
      return;
    }
    progress.value = withTiming(target, { duration: 100 });
    opacity.value = withTiming(target, { duration: 50 });
  }, [checked, reduceMotion, progress, opacity]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.neutral[300], color]
    ),
  }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className="items-center justify-center rounded-full border-2 bg-transparent"
      style={[{ height: SIZE, width: SIZE, borderColor: color }, borderStyle]}
    >
      <Animated.View
        className={`size-[10px] rounded-[10px] ${checked && "bg-primary-300"}`}
        style={dotStyle}
      />
    </Animated.View>
  );
}

function RadioRoot({ checked = false, children, ...props }: RootProps) {
  return (
    <Root accessibilityRole="radio" checked={checked} {...props}>
      {children}
    </Root>
  );
}

function RadioBase({
  checked = false,
  testID,
  label,
  ...props
}: RootProps & { label?: string }) {
  return (
    <RadioRoot checked={checked} testID={testID} {...props}>
      <RadioIcon checked={checked} />
      {label ? (
        <Label testID={testID ? `${testID}-label` : undefined} text={label} />
      ) : null}
    </RadioRoot>
  );
}

export const Radio = Object.assign(RadioBase, {
  Icon: RadioIcon,
  Root: RadioRoot,
  Label,
});
