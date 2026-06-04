import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";

import { resources } from "./resources";
import { getLanguage } from "./utils";

export * from "./utils";

i18n.use(initReactI18next).init({
  resources,
  lng: getLanguage() || getLocales()[0]?.languageTag, // TODO: if you are not supporting multiple languages or languages with multiple directions you can set the default value to `en`
  fallbackLng: "en",
  compatibilityJSON: "v4",

  interpolation: {
    // React already escapes interpolated values, so i18next escaping is off.
    escapeValue: false,
  },
});

export const isRTL: boolean = i18n.dir() === "rtl";

I18nManager.allowRTL(isRTL);
I18nManager.forceRTL(isRTL);

export default i18n;
