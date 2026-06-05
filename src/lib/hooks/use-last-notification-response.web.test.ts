import * as Notifications from "expo-notifications";
import { renderHook } from "@/lib/test-utils";
import { useLastNotificationResponse } from "./use-last-notification-response.web";

// Mirror the real failure: expo-notifications' hook calls the native-only
// `getLastNotificationResponse`, which throws an UnavailabilityError on web.
jest.mock("expo-notifications", () => ({
  useLastNotificationResponse: jest.fn(() => {
    throw new Error(
      "The method or property ExpoNotifications.getLastNotificationResponse is not available on web"
    );
  }),
}));

describe("useLastNotificationResponse (web)", () => {
  it("reports no response without touching the native notifications module", () => {
    const { result } = renderHook(() => useLastNotificationResponse());

    expect(result.current).toBeNull();
    expect(Notifications.useLastNotificationResponse).not.toHaveBeenCalled();
  });
});
