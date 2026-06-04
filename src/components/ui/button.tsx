import * as React from "react";
import type { PressableProps, View } from "react-native";
import { ActivityIndicator, Text } from "react-native";
import type { VariantProps } from "tailwind-variants";
import { tv } from "tailwind-variants";

import { PressableScale } from "./pressable-scale";

const button = tv({
  slots: {
    container: "my-2 flex flex-row items-center justify-center rounded-xl px-4",
    label: "font-inter font-semibold text-base",
    indicator: "h-6 text-white",
  },

  variants: {
    variant: {
      default: {
        container: "bg-black dark:bg-white",
        label: "text-white dark:text-black",
        indicator: "text-white dark:text-black",
      },
      secondary: {
        container: "bg-primary-600",
        label: "text-secondary-600",
        indicator: "text-white",
      },
      outline: {
        container: "border border-neutral-400",
        label: "text-black dark:text-neutral-100",
        indicator: "text-black dark:text-neutral-100",
      },
      destructive: {
        container: "bg-red-600",
        label: "text-white",
        indicator: "text-white",
      },
      ghost: {
        container: "bg-transparent",
        label: "text-black underline dark:text-white",
        indicator: "text-black dark:text-white",
      },
      link: {
        container: "bg-transparent",
        label: "text-black",
        indicator: "text-black",
      },
    },
    size: {
      default: {
        container: "h-10 px-4",
        label: "text-base",
      },
      lg: {
        container: "h-12 px-8",
        label: "text-xl",
      },
      sm: {
        container: "h-8 px-3",
        label: "text-sm",
        indicator: "h-2",
      },
      icon: { container: "size-9" },
    },
    disabled: {
      true: {
        container: "bg-neutral-300 dark:bg-neutral-300",
        label: "text-neutral-600 dark:text-neutral-600",
        indicator: "text-neutral-400 dark:text-neutral-400",
      },
    },
    fullWidth: {
      true: {
        container: "",
      },
      false: {
        container: "self-center",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    disabled: false,
    fullWidth: true,
    size: "default",
  },
});

type ButtonVariants = VariantProps<typeof button>;
type Props = {
  label?: string;
  loading?: boolean;
  className?: string;
  textClassName?: string;
} & ButtonVariants &
  Omit<PressableProps, "disabled">;

export function Button({
  ref,
  label: text,
  loading = false,
  variant = "default",
  disabled = false,
  size = "default",
  className = "",
  testID,
  textClassName = "",
  ...props
}: Props & { ref?: React.RefObject<View | null> }) {
  const styles = React.useMemo(
    () => button({ variant, disabled, size }),
    [variant, disabled, size]
  );

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={styles.container({ className })}
      disabled={disabled || loading}
      {...props}
      ref={ref}
      testID={testID}
    >
      {props.children ? (
        props.children
      ) : (
        // biome-ignore lint/complexity/noUselessFragments: the wrapping fragment is part of the render tree contract relied on by button.test.tsx
        <>
          {loading ? (
            <ActivityIndicator
              className={styles.indicator()}
              size="small"
              testID={testID ? `${testID}-activity-indicator` : undefined}
            />
          ) : (
            <Text
              className={styles.label({ className: textClassName })}
              testID={testID ? `${testID}-label` : undefined}
            >
              {text}
            </Text>
          )}
        </>
      )}
    </PressableScale>
  );
}
