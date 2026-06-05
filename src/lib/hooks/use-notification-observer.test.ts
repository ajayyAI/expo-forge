import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { act, renderHook } from "@/lib/test-utils";
import { useLastNotificationResponse } from "./use-last-notification-response";
import { useNotificationObserver } from "./use-notification-observer";

const DEFAULT_ACTION = "expo.modules.notifications.actions.DEFAULT";

jest.mock("./use-last-notification-response", () => ({
  useLastNotificationResponse: jest.fn(() => null),
}));

jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

// Keep the routing test focused on the observer; the allowlist has its own
// tests. A bare internal path passes through, anything else is rejected.
jest.mock("@/lib/deep-link", () => ({
  resolveDeepLink: (url: unknown) =>
    typeof url === "string" && url.startsWith("/") ? url : null,
}));

const mockedUseLastResponse = useLastNotificationResponse as jest.Mock;
const mockedAddResponseListener =
  Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockedPush = router.push as jest.Mock;

function makeResponse(
  url: unknown,
  { actionIdentifier = DEFAULT_ACTION, identifier = "n1" } = {}
): Notifications.NotificationResponse {
  return {
    actionIdentifier,
    notification: { request: { identifier, content: { data: { url } } } },
  } as unknown as Notifications.NotificationResponse;
}

afterEach(() => {
  jest.clearAllMocks();
  mockedUseLastResponse.mockReturnValue(null);
});

describe("useNotificationObserver", () => {
  it("routes the cold-start tap that launched the app", () => {
    mockedUseLastResponse.mockReturnValue(makeResponse("/profile"));

    renderHook(() => useNotificationObserver());

    expect(mockedPush).toHaveBeenCalledTimes(1);
    expect(mockedPush).toHaveBeenCalledWith("/profile");
  });

  it("routes a warm tap received while the app is running", () => {
    renderHook(() => useNotificationObserver());

    const handler = mockedAddResponseListener.mock.calls[0][0];
    act(() => handler(makeResponse("/settings", { identifier: "warm" })));

    expect(mockedPush).toHaveBeenCalledWith("/settings");
  });

  it("routes a given notification only once across cold and warm paths", () => {
    mockedUseLastResponse.mockReturnValue(
      makeResponse("/a", { identifier: "dup" })
    );

    renderHook(() => useNotificationObserver());
    const handler = mockedAddResponseListener.mock.calls[0][0];
    act(() => handler(makeResponse("/a", { identifier: "dup" })));

    expect(mockedPush).toHaveBeenCalledTimes(1);
  });

  it("blocks taps whose url is not an app-internal path", () => {
    const warn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    mockedUseLastResponse.mockReturnValue(
      makeResponse("https://evil.example.com")
    );

    renderHook(() => useNotificationObserver());

    expect(mockedPush).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("ignores non-default actions (custom action buttons)", () => {
    mockedUseLastResponse.mockReturnValue(
      makeResponse("/profile", { actionIdentifier: "REPLY" })
    );

    renderHook(() => useNotificationObserver());

    expect(mockedPush).not.toHaveBeenCalled();
  });
});
