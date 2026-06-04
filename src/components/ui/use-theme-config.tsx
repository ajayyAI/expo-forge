import { DarkTheme as _DarkTheme, DefaultTheme } from "expo-router";
import type { Theme } from "expo-router/react-navigation";
import { useUniwind } from "uniwind";

import { type ColorScheme, getThemeTokens } from "@/components/ui/theme";

function navigationTheme(base: Theme, scheme: ColorScheme): Theme {
  const tokens = getThemeTokens(scheme);
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: tokens.accent,
      background: tokens.background,
      card: tokens.background,
      text: tokens.foreground,
      border: tokens.border,
      notification: tokens.accent,
    },
  };
}

const DarkTheme = navigationTheme(_DarkTheme, "dark");
const LightTheme = navigationTheme(DefaultTheme, "light");

export function useThemeConfig() {
  const { theme } = useUniwind();

  if (theme === "dark") {
    return DarkTheme;
  }

  return LightTheme;
}
