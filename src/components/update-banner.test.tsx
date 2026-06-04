import {
  initialWindowMetrics,
  SafeAreaProvider,
} from "react-native-safe-area-context";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { useOtaUpdate } from "@/lib/hooks/use-ota-update";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cleanup, fireEvent, render, screen } from "@/lib/test-utils";
import { UpdateBanner } from "./update-banner";

const metrics = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderBanner() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <UpdateBanner />
    </SafeAreaProvider>
  );
}

jest.mock("@/lib/hooks/use-ota-update", () => ({
  useOtaUpdate: jest.fn(),
}));

jest.mock("@/lib/hooks/use-online-status", () => ({
  useOnlineStatus: jest.fn(),
}));

jest.mock("@/lib/hooks/use-reduced-motion", () => ({
  useReducedMotion: jest.fn(),
}));

const otaMock = useOtaUpdate as jest.Mock;
const onlineMock = useOnlineStatus as jest.Mock;
const reduceMotionMock = useReducedMotion as jest.Mock;

beforeEach(() => {
  reduceMotionMock.mockReturnValue(false);
  onlineMock.mockReturnValue({ isOffline: false });
});

afterEach(() => {
  cleanup();
  otaMock.mockReset();
  onlineMock.mockReset();
  reduceMotionMock.mockReset();
});

describe("UpdateBanner", () => {
  it("renders the message and reload button when an update is ready", () => {
    otaMock.mockReturnValue({ isUpdateReady: true, reload: jest.fn() });
    renderBanner();

    expect(screen.getByText("A new update is available")).toBeOnTheScreen();
    expect(screen.getByText("Update now")).toBeOnTheScreen();
    expect(screen.getByTestId("update-banner").props.accessibilityRole).toBe(
      "alert"
    );
  });

  it("calls reload when the button is pressed", () => {
    const reload = jest.fn();
    otaMock.mockReturnValue({ isUpdateReady: true, reload });
    renderBanner();

    fireEvent.press(screen.getByTestId("update-banner-reload"));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when no update is ready", () => {
    otaMock.mockReturnValue({ isUpdateReady: false, reload: jest.fn() });
    renderBanner();

    expect(
      screen.queryByText("A new update is available")
    ).not.toBeOnTheScreen();
  });

  it("renders nothing when an update is ready but the device is offline", () => {
    otaMock.mockReturnValue({ isUpdateReady: true, reload: jest.fn() });
    onlineMock.mockReturnValue({ isOffline: true });
    renderBanner();

    expect(
      screen.queryByText("A new update is available")
    ).not.toBeOnTheScreen();
  });

  it("renders with reduced motion enabled", () => {
    reduceMotionMock.mockReturnValue(true);
    otaMock.mockReturnValue({ isUpdateReady: true, reload: jest.fn() });
    renderBanner();

    expect(screen.getByText("A new update is available")).toBeOnTheScreen();
  });
});
