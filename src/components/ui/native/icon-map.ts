import type { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useUniwind } from "uniwind";
import { getThemeTokens } from "../theme";

type MaterialName = ComponentProps<typeof MaterialIcons>["name"];

/**
 * Semantic icon names the app uses. Each maps to a platform-appropriate glyph:
 * an SF Symbol on iOS (rendered by `expo-symbols`) and a Material icon on
 * Android / web (rendered by `@expo/vector-icons`).
 *
 * Add new entries here so every platform stays in sync from one place. This
 * module is platform-neutral (pure data + a type import) and is safe to import
 * from any bundle — it pulls in no native-only code.
 */
export type IconName =
  | "home"
  | "settings"
  | "search"
  | "add"
  | "close"
  | "check"
  | "chevron-right"
  | "chevron-down"
  | "heart"
  | "star"
  | "share"
  | "trash"
  | "info"
  | "warning"
  | "bell"
  | "person"
  | "lock"
  | "globe"
  | "bolt"
  | "sparkles"
  | "shield";

interface IconGlyph {
  /** SF Symbol name (iOS). */
  sf: string;
  /** Material icon name (Android / web). */
  material: MaterialName;
}

export const ICON_MAP: Record<IconName, IconGlyph> = {
  home: { sf: "house.fill", material: "home" },
  settings: { sf: "gearshape.fill", material: "settings" },
  search: { sf: "magnifyingglass", material: "search" },
  add: { sf: "plus", material: "add" },
  close: { sf: "xmark", material: "close" },
  check: { sf: "checkmark", material: "check" },
  "chevron-right": { sf: "chevron.right", material: "chevron-right" },
  "chevron-down": { sf: "chevron.down", material: "expand-more" },
  heart: { sf: "heart.fill", material: "favorite" },
  star: { sf: "star.fill", material: "star" },
  share: { sf: "square.and.arrow.up", material: "share" },
  trash: { sf: "trash.fill", material: "delete" },
  info: { sf: "info.circle.fill", material: "info" },
  warning: { sf: "exclamationmark.triangle.fill", material: "warning" },
  bell: { sf: "bell.fill", material: "notifications" },
  person: { sf: "person.fill", material: "person" },
  lock: { sf: "lock.fill", material: "lock" },
  globe: { sf: "globe", material: "language" },
  bolt: { sf: "bolt.fill", material: "bolt" },
  sparkles: { sf: "sparkles", material: "auto-awesome" },
  shield: { sf: "checkmark.shield.fill", material: "verified-user" },
};

export interface IconProps {
  /** Semantic icon name (see {@link IconName}). */
  name: IconName;
  /** Point size of the icon. Defaults to 24. */
  size?: number;
  /**
   * Tint color. When omitted, resolves to the active theme's foreground token
   * (see {@link useDefaultIconColor}) so the icon is legible in both light and
   * dark mode.
   */
  color?: string;
  /** Optional test id. */
  testID?: string;
}

export const DEFAULT_ICON_SIZE = 24;

/**
 * Default icon color, resolved from the active theme's foreground token.
 *
 * Hardcoding a single color (e.g. a dark gray) is near-invisible in the
 * opposite scheme; reading the live Uniwind theme keeps an Icon with no
 * explicit `color` legible in both light and dark mode.
 */
export function useDefaultIconColor(): string {
  const { theme } = useUniwind();
  const scheme = theme === "dark" ? "dark" : "light";
  return getThemeTokens(scheme).foreground;
}
