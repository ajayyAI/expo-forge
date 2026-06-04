import * as Updates from "expo-updates";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

// `Updates.isEnabled` is false in dev, in Expo Go, and on web, so this single
// guard covers every case where the native module is inert. Every call is also
// wrapped so a missing/misconfigured update URL can't surface as a runtime
// throw — a downloaded-but-unusable update simply leaves the banner hidden.
async function checkAndFetch(): Promise<boolean> {
  if (!Updates.isEnabled) {
    return false;
  }
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (!isAvailable) {
      return false;
    }
    const { isNew } = await Updates.fetchUpdateAsync();
    return isNew;
  } catch {
    return false;
  }
}

/**
 * Checks for an OTA update on mount and on every app foreground, downloads it
 * when available, and exposes a `reload` that swaps in the new bundle. A no-op
 * unless `expo-updates` is enabled in the running build, so it never runs (or
 * throws) in dev, Expo Go, or on web.
 */
export function useOtaUpdate(): {
  isUpdateReady: boolean;
  reload: () => Promise<void>;
} {
  const [isUpdateReady, setIsUpdateReady] = useState(false);

  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }
    let active = true;
    let fetching = false;
    const run = () => {
      if (fetching) {
        return;
      }
      fetching = true;
      checkAndFetch()
        .then((ready) => {
          if (active && ready) {
            setIsUpdateReady(true);
          }
        })
        .finally(() => {
          fetching = false;
        });
    };

    run();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        run();
      }
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const reload = useCallback(async () => {
    if (!Updates.isEnabled) {
      return;
    }
    try {
      await Updates.reloadAsync();
    } catch {
      // A failed reload leaves the app on the current bundle; nothing to do.
    }
  }, []);

  return { isUpdateReady, reload };
}
