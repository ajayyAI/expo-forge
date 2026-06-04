import {
  initialWindowMetrics,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cleanup, render, screen } from "@/lib/test-utils";
import { OfflineBanner } from "./offline-banner";

const metrics = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function bannerTree() {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <OfflineBanner />
    </SafeAreaProvider>
  );
}

function renderBanner() {
  return render(bannerTree());
}

jest.mock("@/lib/hooks/use-online-status", () => ({
  useOnlineStatus: jest.fn(),
}));

jest.mock("@/lib/hooks/use-reduced-motion", () => ({
  useReducedMotion: jest.fn(),
}));

const onlineMock = useOnlineStatus as jest.Mock;
const reduceMotionMock = useReducedMotion as jest.Mock;

beforeEach(() => {
  reduceMotionMock.mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  onlineMock.mockReset();
  reduceMotionMock.mockReset();
});

describe("OfflineBanner", () => {
  it("renders the offline message when offline", () => {
    onlineMock.mockReturnValue({ isOffline: true });
    renderBanner();
    expect(screen.getByText("No internet connection")).toBeOnTheScreen();
    expect(screen.getByTestId("offline-banner").props.accessibilityRole).toBe(
      "alert"
    );
    expect(
      screen.getByTestId("offline-banner").props.accessibilityLiveRegion
    ).toBe("assertive");
  });

  it("renders nothing when online", () => {
    onlineMock.mockReturnValue({ isOffline: false });
    renderBanner();
    expect(screen.queryByText("No internet connection")).not.toBeOnTheScreen();
  });

  it("mounts and unmounts as the connection drops and recovers", () => {
    onlineMock.mockReturnValue({ isOffline: false });
    const { rerender } = renderBanner();
    expect(screen.queryByText("No internet connection")).not.toBeOnTheScreen();

    onlineMock.mockReturnValue({ isOffline: true });
    rerender(bannerTree());
    expect(screen.getByText("No internet connection")).toBeOnTheScreen();

    onlineMock.mockReturnValue({ isOffline: false });
    rerender(bannerTree());
    expect(screen.queryByText("No internet connection")).not.toBeOnTheScreen();
  });

  it("renders the message with reduced motion enabled", () => {
    reduceMotionMock.mockReturnValue(true);
    onlineMock.mockReturnValue({ isOffline: true });
    renderBanner();
    expect(screen.getByText("No internet connection")).toBeOnTheScreen();
  });
});
