/**
 * Haptic feedback seam, backed by `expo-haptics`.
 *
 * Reserved for state changes and decisions — a button press, a toggle, a
 * destructive confirm, a request outcome — not navigation or scrolling, so the
 * feedback stays signal instead of noise.
 *
 * No-ops on web, and respects a persisted user preference (default on) so the
 * whole app can be silenced from Settings. Callers use a small local vocabulary
 * (`"light" | "success" | ...`) rather than expo-haptics' enums, so removing the
 * library later means editing only this file.
 *
 * To remove haptics entirely: delete this file and its call sites, then
 * `bun remove expo-haptics`.
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { storage } from "./storage";

export const HAPTICS_ENABLED_KEY = "HAPTICS_ENABLED";

export type ImpactStyle = "light" | "medium" | "heavy";
export type NotifyType = "success" | "warning" | "error";

const impactStyles = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

const notifyTypes = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
} as const;

function active(): boolean {
  if (Platform.OS === "web") {
    return false;
  }
  return storage.getBoolean(HAPTICS_ENABLED_KEY) ?? true;
}

// Haptics are fire-and-forget; a rejected promise (e.g. unsupported hardware)
// must never surface to the caller or crash the interaction.
function fire(run: () => Promise<unknown>): void {
  if (active()) {
    run().catch(() => undefined);
  }
}

/** Light tick for selections and press feedback (taps, toggles). */
export function selection(): void {
  fire(() => Haptics.selectionAsync());
}

/** Impact for a deliberate action landing, e.g. a primary button. */
export function impact(style: ImpactStyle = "light"): void {
  fire(() => Haptics.impactAsync(impactStyles[style]));
}

/** Outcome feedback for a decision or result (success / warning / error). */
export function notify(type: NotifyType = "success"): void {
  fire(() => Haptics.notificationAsync(notifyTypes[type]));
}

/** Read the persisted preference (default on). For the Settings toggle. */
export function isEnabled(): boolean {
  return storage.getBoolean(HAPTICS_ENABLED_KEY) ?? true;
}

/** Persist the preference. */
export function setEnabled(value: boolean): void {
  storage.set(HAPTICS_ENABLED_KEY, value);
}
