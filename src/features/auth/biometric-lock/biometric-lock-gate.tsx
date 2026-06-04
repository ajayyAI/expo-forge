import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { LockScreen } from "./components/lock-screen";
import { useBiometricLock } from "./use-biometric-lock";

/**
 * App-lock boundary. Renders `children` unconditionally and, when locked,
 * overlays a full-screen lock screen on top — keeping the tree mounted so
 * navigation state survives a lock/unlock cycle (the opaque overlay also hides
 * content). Inactive (build flag or user preference off) → `locked` is always
 * false, so this is a transparent pass-through.
 */
export function BiometricLockGate({ children }: { children: ReactNode }) {
  const { locked, pending, error, unlock } = useBiometricLock();

  return (
    <View style={styles.container}>
      {children}
      {locked ? (
        <View style={StyleSheet.absoluteFill} testID="biometric-lock-overlay">
          <LockScreen
            error={error}
            onUnlock={() => {
              unlock().catch(() => {
                // unlock() surfaces failures via `error`.
              });
            }}
            pending={pending}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
