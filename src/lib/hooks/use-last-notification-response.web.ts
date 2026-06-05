import type { NotificationResponse } from "expo-notifications";

// Web override. expo-notifications' `useLastNotificationResponse` reads the
// native-only `getLastNotificationResponse`, which throws on web. There is no
// cold-start notification tap on web, so this always reports "no response".
export function useLastNotificationResponse(): NotificationResponse | null {
  return null;
}
