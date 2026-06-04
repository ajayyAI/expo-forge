import { useNetworkState } from "expo-network";
import { useMemo } from "react";

// Treats offline as a definitive negative signal only. `expo-network` reports
// `isConnected: undefined` during the initial undetermined state (and on web
// before its first `online`/`offline` event), which must NOT read as offline —
// otherwise the banner would flash on launch. On web the module derives state
// from `navigator.onLine` and subscribes to the `online`/`offline` events, so
// `isConnected` becomes a real boolean and never gets stuck.
export function useOnlineStatus(): { isOffline: boolean } {
  const { isConnected } = useNetworkState();
  return useMemo(() => ({ isOffline: isConnected === false }), [isConnected]);
}
