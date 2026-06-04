import * as Updates from "expo-updates";
import { AppState } from "react-native";
import { act, renderHook, waitFor } from "@/lib/test-utils";
import { useOtaUpdate } from "./use-ota-update";

jest.mock("expo-updates", () => ({
  isEnabled: false,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

const updates = Updates as jest.Mocked<typeof Updates> & { isEnabled: boolean };

function setEnabled(value: boolean) {
  Object.defineProperty(updates, "isEnabled", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  setEnabled(false);
});

describe("useOtaUpdate", () => {
  it("is a no-op when updates are disabled", async () => {
    setEnabled(false);
    const { result } = renderHook(() => useOtaUpdate());

    // Give the mount effect a tick to (not) run.
    await act(async () => {
      await Promise.resolve();
    });

    expect(updates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(result.current.isUpdateReady).toBe(false);
  });

  it("fetches and marks ready when an update is available", async () => {
    setEnabled(true);
    updates.checkForUpdateAsync.mockResolvedValue({
      isAvailable: true,
    } as Awaited<ReturnType<typeof Updates.checkForUpdateAsync>>);
    updates.fetchUpdateAsync.mockResolvedValue({
      isNew: true,
    } as Awaited<ReturnType<typeof Updates.fetchUpdateAsync>>);

    const { result } = renderHook(() => useOtaUpdate());

    await waitFor(() => expect(result.current.isUpdateReady).toBe(true));
    expect(updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it("stays not-ready when no update is available", async () => {
    setEnabled(true);
    updates.checkForUpdateAsync.mockResolvedValue({
      isAvailable: false,
    } as Awaited<ReturnType<typeof Updates.checkForUpdateAsync>>);

    const { result } = renderHook(() => useOtaUpdate());

    await act(async () => {
      await Promise.resolve();
    });

    expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
    expect(result.current.isUpdateReady).toBe(false);
  });

  it("swallows errors from check/fetch and never throws", async () => {
    setEnabled(true);
    updates.checkForUpdateAsync.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useOtaUpdate());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isUpdateReady).toBe(false);
  });

  it("does not start a concurrent check while one is in flight", async () => {
    setEnabled(true);
    // Hold the first check unresolved so a foreground transition lands mid-flight.
    type CheckResult = Awaited<ReturnType<typeof Updates.checkForUpdateAsync>>;
    let resolveCheck: (value: CheckResult) => void = () => {
      // Assigned synchronously below before any consumer runs.
    };
    updates.checkForUpdateAsync.mockReturnValue(
      new Promise<CheckResult>((resolve) => {
        resolveCheck = resolve;
      })
    );

    let appStateHandler: ((state: string) => void) | undefined;
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() };
      });

    renderHook(() => useOtaUpdate());

    // Mount fired the first check; it's still pending.
    expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);

    // A background→active flip while the check is in flight must be ignored.
    act(() => {
      appStateHandler?.("active");
    });
    expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);

    // Let the in-flight check settle, then the guard is free again.
    updates.fetchUpdateAsync.mockResolvedValue({
      isNew: false,
    } as Awaited<ReturnType<typeof Updates.fetchUpdateAsync>>);
    await act(async () => {
      resolveCheck({ isAvailable: false } as CheckResult);
      await Promise.resolve();
    });
    expect(updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it("reload() calls Updates.reloadAsync", async () => {
    setEnabled(true);
    updates.reloadAsync.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOtaUpdate());

    await act(async () => {
      await result.current.reload();
    });

    expect(updates.reloadAsync).toHaveBeenCalledTimes(1);
  });
});
