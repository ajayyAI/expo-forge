import * as React from "react";
import type { TextInputProps } from "react-native";
import {
  I18nManager,
  TextInput as NTextInput,
  StyleSheet,
  View,
} from "react-native";
import { tv } from "tailwind-variants";

import colors from "./colors";
import { Text } from "./text";

const inputTv = tv({
  slots: {
    container: "mb-2",
    label: "mb-1 text-grey-100 text-lg dark:text-neutral-100",
    input:
      "mt-0 rounded-xl border-[0.5px] border-neutral-300 bg-neutral-100 px-4 py-3 font-inter font-medium text-base/5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white",
  },

  variants: {
    focused: {
      true: {
        input: "border-neutral-400 dark:border-neutral-300",
      },
    },
    error: {
      true: {
        input: "border-danger-600",
        label: "text-danger-600 dark:text-danger-600",
      },
    },
    disabled: {
      true: {
        input: "bg-neutral-200",
      },
    },
  },
  defaultVariants: {
    focused: false,
    error: false,
    disabled: false,
  },
});

export type NInputProps = {
  label?: string;
  disabled?: boolean;
  error?: string;
} & TextInputProps;

export function Input({
  ref,
  ...props
}: NInputProps & { ref?: React.Ref<NTextInput | null> }) {
  const {
    label,
    error,
    testID,
    onBlur: onBlurProp,
    onFocus: onFocusProp,
    ...inputProps
  } = props;
  const [isFocussed, setIsFocussed] = React.useState(false);

  const onBlur = React.useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: the blur event union differs across RN input variants; `any` forwards it verbatim to the caller's onBlur without over-constraining.
    (e: any) => {
      setIsFocussed(false);
      onBlurProp?.(e);
    },
    [onBlurProp]
  );

  const onFocus = React.useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: the focus event union differs across RN input variants; `any` forwards it verbatim to the caller's onFocus without over-constraining.
    (e: any) => {
      setIsFocussed(true);
      onFocusProp?.(e);
    },
    [onFocusProp]
  );

  const styles = inputTv({
    error: Boolean(error),
    focused: isFocussed,
    disabled: Boolean(props.disabled),
  });

  return (
    <View className={styles.container()}>
      {label && (
        <Text
          className={styles.label()}
          testID={testID ? `${testID}-label` : undefined}
        >
          {label}
        </Text>
      )}
      <NTextInput
        className={styles.input()}
        maxFontSizeMultiplier={1.5}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholderTextColor={colors.neutral[400]}
        ref={ref}
        testID={testID}
        {...inputProps}
        style={StyleSheet.flatten([
          { writingDirection: I18nManager.isRTL ? "rtl" : "ltr" },
          { textAlign: I18nManager.isRTL ? "right" : "left" },
          inputProps.style,
        ])}
      />
      {error && (
        <Text
          className="text-danger-400 text-sm dark:text-danger-600"
          testID={testID ? `${testID}-error` : undefined}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
