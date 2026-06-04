import * as React from "react";
import type { TextProps, TextStyle } from "react-native";
import { I18nManager, Text as NNText, StyleSheet } from "react-native";
import { twMerge } from "tailwind-merge";
import type { TxKeyPath } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

type Props = {
  className?: string;
  tx?: TxKeyPath;
} & TextProps;

export function Text({ className = "", style, tx, children, ...props }: Props) {
  const textStyle = React.useMemo(
    () =>
      twMerge(
        "font-inter font-normal text-base text-black dark:text-white",
        className
      ),
    [className]
  );

  const nStyle = React.useMemo(
    () =>
      StyleSheet.flatten([
        {
          writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
        },
        style,
      ]) as TextStyle,
    [style]
  );
  return (
    <NNText
      className={textStyle}
      maxFontSizeMultiplier={1.5}
      style={nStyle}
      {...props}
    >
      {tx ? translate(tx) : children}
    </NNText>
  );
}
