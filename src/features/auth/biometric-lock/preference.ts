import { useMMKVBoolean } from "react-native-mmkv";

import { storage } from "@/lib/storage";

// App-namespaced MMKV key for the user's app-lock opt-in (matches the
// app-attest key style). Default OFF — absence means disabled.
const BIOMETRIC_LOCK_KEY = "expo-forge.biometric-lock.enabled";

/** Reactive accessor for the app-lock preference. `[enabled, setEnabled]`. */
export function useBiometricLockEnabled(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useMMKVBoolean(BIOMETRIC_LOCK_KEY, storage);
  return [enabled ?? false, setEnabled];
}

/** Non-reactive read, for code paths outside React (default false). */
export function getBiometricLockEnabled(): boolean {
  return storage.getBoolean(BIOMETRIC_LOCK_KEY) ?? false;
}

/** Non-reactive write. */
export function setBiometricLockEnabled(value: boolean): void {
  storage.set(BIOMETRIC_LOCK_KEY, value);
}
