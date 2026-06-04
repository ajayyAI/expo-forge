import { Platform } from "react-native";

// NativeTabs doesn't expose the Android tab-bar height; pad scroll content so it
// clears the Material tab bar. iOS insets tab-screen content automatically.
export const ANDROID_TAB_BAR_INSET = Platform.OS === "android" ? 96 : 0;
