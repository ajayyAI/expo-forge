import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { translate } from "@/lib/i18n";

import { confirmWithBiometrics } from "../biometric";
import { BIOMETRIC_LOCK_ENABLED } from "./config";
import { useBiometricLockEnabled } from "./preference";

interface BiometricLockState {
  locked: boolean;
  pending: boolean;
  error: string | undefined;
  unlock: () => Promise<void>;
}

/**
 * Drives the app-lock overlay.
 *
 * `active` requires BOTH the build flag and the user preference. When inactive
 * the hook is fully inert: `locked` is always false and no AppState listener is
 * registered, so an excised/disabled feature costs nothing.
 *
 * When active: starts locked (cold-launch lock); backgrounding re-locks
 * immediately (also hides content in the app-switcher snapshot); returning from
 * background re-arms a single auto-prompt. `unlock()` reuses
 * `confirmWithBiometrics`, which degrades open on web / no-hardware /
 * not-enrolled — so the app can never lock itself out permanently.
 *
 * Fail-safe: a failed (`false`) or thrown prompt leaves the app LOCKED and
 * surfaces an error; only a successful confirmation unlocks. `busyRef` blocks
 * re-entry (double-tap / auto-prompt racing a manual tap).
 */
export function useBiometricLock(): BiometricLockState {
  const [userEnabled] = useBiometricLockEnabled();
  const active = BIOMETRIC_LOCK_ENABLED && userEnabled;

  const [locked, setLocked] = useState(active);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const busyRef = useRef(false);
  // Cold-launch auto-prompt guard: set once so a failed/cancelled first attempt
  // doesn't loop (the user taps the manual Unlock button). Never reset — resume
  // prompts are driven directly by the AppState listener below.
  const autoPromptedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const unlock = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setPending(true);
    setError(undefined);

    try {
      const confirmed = await confirmWithBiometrics(
        translate("biometric_lock.prompt")
      );
      if (confirmed) {
        setLocked(false);
      } else {
        setError(translate("biometric_lock.error"));
      }
    } catch {
      // Fail-safe: never unlock on a thrown prompt — stay locked, show error.
      setError(translate("biometric_lock.error"));
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }, []);

  // AppState listener: only while active. Backgrounding re-locks immediately
  // (covering the app-switcher snapshot); a genuine background→active return
  // re-prompts. We key the resume prompt on the *previous* state being
  // `background` because the iOS biometric dialog round-trips the app through
  // `inactive` (never `background`) — so a Control Center peek or the prompt's
  // own churn can't spuriously re-lock or loop. `busyRef` inside `unlock`
  // guards re-entry.
  useEffect(() => {
    if (!active) {
      return;
    }
    const subscription = AppState.addEventListener("change", (state) => {
      const previous = appStateRef.current;
      appStateRef.current = state;
      if (state === "background") {
        setLocked(true);
      } else if (state === "active" && previous === "background") {
        setLocked(true);
        unlock().catch(() => {
          // unlock() already surfaces failures via `error`.
        });
      }
    });
    return () => subscription.remove();
  }, [active, unlock]);

  // Cold-launch auto-prompt: fire once when first locked. `autoPromptedRef`
  // stops a failed/cancelled attempt from re-looping (the user then taps the
  // manual Unlock button); resume prompts are driven by the AppState listener.
  useEffect(() => {
    if (active && locked && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      unlock().catch(() => {
        // unlock() already surfaces failures via `error`.
      });
    }
  }, [active, locked, unlock]);

  return { locked: active && locked, pending, error, unlock };
}
