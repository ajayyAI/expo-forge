/**
 * `useBiometricLock` is the app-lock gate's core. It combines the build flag
 * and the user preference into `active`; only when active does it lock on cold
 * launch, register an AppState listener (re-lock on background, re-prompt on
 * resume), and run `unlock()`. These tests pin that contract and the fail-safe
 * behaviour of `unlock()` (a thrown or failed prompt must leave the app LOCKED,
 * never accidentally open).
 */

import { act, renderHook, waitFor } from "@testing-library/react-native";

let mockBuildFlag = true;
jest.mock("../config", () => ({
  get BIOMETRIC_LOCK_ENABLED() {
    return mockBuildFlag;
  },
}));

let mockUserEnabled = true;
const mockSetUserEnabled = jest.fn();
jest.mock("../preference", () => ({
  useBiometricLockEnabled: () => [mockUserEnabled, mockSetUserEnabled],
}));

const mockConfirm = jest.fn();
jest.mock("../../biometric", () => ({
  confirmWithBiometrics: (...args: unknown[]) => mockConfirm(...args),
}));

// Avoid pulling in the i18n runtime (which touches native modules absent under
// the full react-native mock); the hook only needs a string back.
jest.mock("@/lib/i18n", () => ({
  translate: (key: string) => key,
}));

// Capture the AppState change handler so cases can drive transitions directly.
type AppStateStatus = "active" | "background" | "inactive";
let appStateHandler: ((state: AppStateStatus) => void) | undefined;
const mockRemove = jest.fn();
jest.mock("react-native", () => ({
  Platform: { OS: "ios", select: (obj: Record<string, unknown>) => obj.ios },
  AppState: {
    currentState: "active" as AppStateStatus,
    addEventListener: (
      _event: string,
      handler: (s: AppStateStatus) => void
    ) => {
      appStateHandler = handler;
      return { remove: mockRemove };
    },
  },
}));

import { useBiometricLock } from "../use-biometric-lock";

beforeEach(() => {
  mockBuildFlag = true;
  mockUserEnabled = true;
  mockConfirm.mockReset();
  mockConfirm.mockResolvedValue(true);
  mockSetUserEnabled.mockReset();
  mockRemove.mockReset();
  appStateHandler = undefined;
});

describe("useBiometricLock — inactive", () => {
  it("is never locked and registers no AppState listener when the build flag is off", () => {
    mockBuildFlag = false;
    const { result } = renderHook(() => useBiometricLock());

    expect(result.current.locked).toBe(false);
    expect(appStateHandler).toBeUndefined();
  });

  it("is never locked when the user preference is off", () => {
    mockUserEnabled = false;
    const { result } = renderHook(() => useBiometricLock());

    expect(result.current.locked).toBe(false);
    expect(appStateHandler).toBeUndefined();
  });
});

describe("useBiometricLock — active", () => {
  it("starts locked on cold launch and auto-prompts once", async () => {
    // Hold the prompt unresolved so the initial locked state is observable
    // before the auto-prompt flushes.
    mockConfirm.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useBiometricLock());

    expect(result.current.locked).toBe(true);
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
  });

  it("unlock() unlocks when the prompt succeeds", async () => {
    mockConfirm.mockResolvedValue(true);
    const { result } = renderHook(() => useBiometricLock());

    await act(async () => {
      await result.current.unlock();
    });

    expect(result.current.locked).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it("unlock() stays locked and sets an error when the prompt fails", async () => {
    mockConfirm.mockResolvedValue(false);
    const { result } = renderHook(() => useBiometricLock());

    await act(async () => {
      await result.current.unlock();
    });

    expect(result.current.locked).toBe(true);
    expect(result.current.error).toBeDefined();
  });

  it("unlock() stays locked and sets an error when the prompt throws (fail-safe)", async () => {
    mockConfirm.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useBiometricLock());

    await act(async () => {
      await result.current.unlock();
    });

    expect(result.current.locked).toBe(true);
    expect(result.current.error).toBeDefined();
  });

  it("re-locks on background and re-prompts on the foreground return", async () => {
    mockConfirm.mockResolvedValue(true);
    const { result } = renderHook(() => useBiometricLock());

    // Cold-launch auto-prompt unlocks us first.
    await waitFor(() => expect(result.current.locked).toBe(false));
    const afterColdLaunch = mockConfirm.mock.calls.length;

    // From here the prompt fails, so the re-prompt leaves us locked and the
    // async auto-prompt settles to a stable state for assertions.
    mockConfirm.mockResolvedValue(false);

    // Background re-locks immediately (covers the app-switcher snapshot).
    await act(async () => {
      appStateHandler?.("background");
      await Promise.resolve();
    });
    expect(result.current.locked).toBe(true);

    // Foreground return re-arms exactly one auto-prompt.
    await act(async () => {
      appStateHandler?.("active");
      await Promise.resolve();
    });
    expect(result.current.locked).toBe(true);
    expect(mockConfirm.mock.calls.length).toBe(afterColdLaunch + 1);
  });

  it("does not re-lock or prompt on a transient inactive blip (e.g. Control Center)", async () => {
    mockConfirm.mockResolvedValue(true);
    const { result } = renderHook(() => useBiometricLock());

    await waitFor(() => expect(result.current.locked).toBe(false));
    const afterColdLaunch = mockConfirm.mock.calls.length;

    // `inactive` (Control Center peek, incoming-call banner, the biometric
    // dialog itself) must NOT lock or fire a prompt.
    await act(async () => {
      appStateHandler?.("inactive");
      await Promise.resolve();
      appStateHandler?.("active");
      await Promise.resolve();
    });

    expect(result.current.locked).toBe(false);
    expect(mockConfirm.mock.calls.length).toBe(afterColdLaunch);
  });

  it("does not loop the auto-prompt when the cold-launch prompt is cancelled", async () => {
    mockConfirm.mockResolvedValue(false);
    const { result } = renderHook(() => useBiometricLock());

    // The single cold-launch auto-prompt fires once and fails; it must not
    // re-fire on its own (the user falls back to the manual Unlock button).
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(result.current.locked).toBe(true);
  });

  it("removes the AppState listener on unmount", () => {
    const { unmount } = renderHook(() => useBiometricLock());
    unmount();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
