/**
 * Push notification surface.
 *
 * Tap-to-route lives in src/lib/hooks/use-notification-observer.ts.
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type DeviceType = "ios" | "android";

const ANDROID_DEFAULT_CHANNEL_ID = "default";

// Display incoming notifications while the app is foregrounded. SDK 54+ split
// the legacy `shouldShowAlert` into `shouldShowBanner` (heads-up) + the
// `shouldShowList` (notification center); badge stays off by default.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
  });
}

/**
 * One-time notification setup. Registers the Android default channel (Android
 * requires a channel for heads-up display); no-ops elsewhere. Safe to call more
 * than once. The foreground handler is set at module load, above.
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** Current OS-level notification permission status, no prompt. */
export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Prompt for notification permission. Returns the resulting status. */
export async function requestPermission(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status;
}

/**
 * Fetch the Expo push token for this device, or null when unavailable.
 *
 * Returns null on simulators/emulators (`!Device.isDevice`) and when no EAS
 * `projectId` is configured — `getExpoPushTokenAsync` requires it to attribute
 * the token, and a fresh boilerplate clone may not have EAS set up yet.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn(
      "Missing EAS projectId; skipping push token registration. Set extra.eas.projectId (EAS_PROJECT_ID)."
    );
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/** Cross-platform device type, or null on web/unsupported platforms. */
export function getDeviceType(): DeviceType | null {
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return Platform.OS;
  }
  return null;
}
