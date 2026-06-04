import type { RefObject } from "react";
import type { View, ViewProps } from "react-native";

/**
 * A platform-adaptive container that renders a "material" background:
 * - iOS  → liquid glass (`expo-glass-effect`, falls back to a card on iOS < 26)
 * - Android → elevated card by default; real frosted blur only when the caller
 *   passes a `blurTarget` ref (Dimezis BlurView requires an explicit target —
 *   it cannot blur arbitrary content behind the view without one)
 * - web / other → plain Uniwind card
 *
 * Pass Tailwind classes via `className` for padding / radius / layout; the
 * wrapper supplies the material background.
 */
export type SurfaceProps = ViewProps & {
  className?: string;
  /** Blur/glass intensity hint, 0-100. Defaults to 50. */
  intensity?: number;
  /**
   * Android only: ref to an `expo-blur` BlurTargetView wrapping the content to
   * blur behind this Surface. Without it, Android renders an elevated card —
   * the Dimezis blur needs an explicit target. iOS/web ignore this.
   */
  blurTarget?: RefObject<View | null>;
};

/** Default rounded-card classes shared by every Surface fallback. */
export const SURFACE_BASE_CLASS = "overflow-hidden rounded-2xl";

/**
 * Non-glass card surface (Android, web, iOS < 26): the rounded base plus a
 * themed background and hairline border, so the card reads as a solid surface
 * instead of a transparent box.
 */
export const SURFACE_CARD_CLASS = `${SURFACE_BASE_CLASS} border border-border bg-card`;
