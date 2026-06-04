import i18n, { type TOptions } from "i18next";
import { useCallback } from "react";
import { I18nManager, NativeModules, Platform } from "react-native";
import { useMMKVString } from "react-native-mmkv";
import RNRestart from "react-native-restart";
import { storage } from "../storage";
import type { Language, resources } from "./resources";
import type { RecursiveKeyOf } from "./types";

type DefaultLocale = typeof resources.en.translation;
export type TxKeyPath = RecursiveKeyOf<DefaultLocale>;

export const LOCAL = "local";

export const getLanguage = () => storage.getString(LOCAL);

// i18next's `t` overloads don't resolve cleanly for a `(key, options)` wrapper,
// so we narrow it to the single shape we use.
export const translate = (key: TxKeyPath, options?: TOptions): string =>
  (i18n.t as (k: TxKeyPath, o?: TOptions) => string)(key, options);

export function changeLanguage(lang: Language) {
  i18n.changeLanguage(lang);
  if (lang === "ar") {
    I18nManager.forceRTL(true);
  } else {
    I18nManager.forceRTL(false);
  }
  if (Platform.OS === "ios" || Platform.OS === "android") {
    if (__DEV__) NativeModules.DevSettings.reload();
    else RNRestart.restart();
  } else if (Platform.OS === "web") {
    window.location.reload();
  }
}

export function useSelectedLanguage() {
  const [language, setLang] = useMMKVString(LOCAL);

  const setLanguage = useCallback(
    (lang: Language) => {
      setLang(lang);
      if (lang !== undefined) changeLanguage(lang as Language);
    },
    [setLang]
  );

  return { language: language as Language, setLanguage };
}
