import { renderHook } from "@testing-library/react-native";
import { useNetworkState } from "expo-network";

import { useOnlineStatus } from "./use-online-status";

jest.mock("expo-network", () => ({
  useNetworkState: jest.fn(),
}));

const mocked = useNetworkState as jest.Mock;

afterEach(() => mocked.mockReset());

describe("useOnlineStatus", () => {
  it("is not offline when connected", () => {
    mocked.mockReturnValue({ isConnected: true, isInternetReachable: true });
    expect(renderHook(() => useOnlineStatus()).result.current.isOffline).toBe(
      false
    );
  });

  it("is offline when connectivity is definitively unavailable", () => {
    mocked.mockReturnValue({ isConnected: false, isInternetReachable: false });
    expect(renderHook(() => useOnlineStatus()).result.current.isOffline).toBe(
      true
    );
  });

  it("is not offline while the state is still undetermined", () => {
    mocked.mockReturnValue({});
    expect(renderHook(() => useOnlineStatus()).result.current.isOffline).toBe(
      false
    );
  });

  it("is not offline when connected but reachability is unknown", () => {
    mocked.mockReturnValue({
      isConnected: true,
      isInternetReachable: undefined,
    });
    expect(renderHook(() => useOnlineStatus()).result.current.isOffline).toBe(
      false
    );
  });

  it("returns a stable object identity while connectivity is unchanged", () => {
    mocked.mockReturnValue({ isConnected: true, isInternetReachable: true });
    const { result, rerender } = renderHook(() => useOnlineStatus());
    const first = result.current;
    rerender({});
    expect(result.current).toBe(first);
  });
});
