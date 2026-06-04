import * as React from "react";
import { useMMKVString } from "react-native-mmkv";
import { Uniwind, useUniwind } from "uniwind";

import { storage } from "../storage";

const SELECTED_THEME = "SELECTED_THEME";
export type ColorSchemeType = "light" | "dark" | "system";
/**
 * For the theme *selector* UI only: reads/writes the persisted choice
 * ('light' | 'dark' | 'system') in MMKV. To style by the active theme, use
 * `useUniwind` instead.
 */
export function useSelectedTheme() {
  const { theme: _theme } = useUniwind();
  const [theme, _setTheme] = useMMKVString(SELECTED_THEME, storage);

  const setSelectedTheme = React.useCallback(
    (t: ColorSchemeType) => {
      Uniwind.setTheme(t);
      _setTheme(t);
    },
    [_setTheme]
  );

  const selectedTheme = (theme ?? "system") as ColorSchemeType;
  return { selectedTheme, setSelectedTheme } as const;
}
// to be used in the root file to load the selected theme from MMKV
export function loadSelectedTheme() {
  const theme = storage.getString(SELECTED_THEME);
  if (theme !== undefined) {
    console.log("theme", theme);
    Uniwind.setTheme(theme as ColorSchemeType);
  }
}
