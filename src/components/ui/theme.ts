/**
 * App-agnostic design tokens for JS-side consumption.
 *
 * Single source of truth for semantic colors when you need raw values in
 * JavaScript (e.g. `tintColor`, `ActivityIndicator color`, native components,
 * chart libraries) rather than Tailwind classes.
 *
 * In JSX prefer the Tailwind/Uniwind semantic classes (`bg-background`,
 * `text-foreground`, `bg-accent`, …) which are defined in `global.css` and
 * provided by HeroUI Native. Reach for `useThemeColor` from `heroui-native`
 * when you need a HeroUI token resolved at runtime; use this file for the
 * app-specific tokens that sit alongside HeroUI's set.
 *
 * Generalized from a production design-system convention: semantic names only,
 * never product-specific. Keep these values in sync with the `@variant
 * light` / `@variant dark` blocks in `global.css`.
 */

import colors from "@/components/ui/colors";

export type ColorScheme = "light" | "dark";

interface SemanticTokens {
  /** Primary screen background. */
  background: string;
  /** Default text / icon color on `background`. */
  foreground: string;
  /** Cards, panels, sheets (HeroUI calls this `surface`). */
  card: string;
  /** Text / icon color on `card`. */
  cardForeground: string;
  /** Muted sections, disabled states. */
  muted: string;
  /** Secondary text — subtitles, descriptions, placeholders. */
  mutedForeground: string;
  /** Standard hairline borders. */
  border: string;
  /** Input field borders. */
  input: string;
  /** Focus ring color. */
  ring: string;
  /** Main brand / action color. */
  accent: string;
  /** Text / icon color on `accent`. */
  accentForeground: string;
  /** Destructive / danger (errors, delete). */
  destructive: string;
  /** Text / icon color on `destructive`. */
  destructiveForeground: string;
  /** Positive / growth state. */
  success: string;
  /** Caution / alert state. */
  warning: string;
}

/**
 * Light and dark token sets, resolved from the `colors` palette so a palette
 * change propagates to every JS consumer (and, via `useThemeConfig`, the
 * navigation chrome) automatically. `accent` / `accentForeground` / `ring` are
 * the brand orange; `global.css` overrides HeroUI's `--accent` /
 * `--accent-foreground` / `--focus` to the SAME values, so the JS and CSS sides
 * stay visually identical (the one place CSS can't read the JS palette — keep
 * the `@variant light` / `@variant dark` blocks in `global.css` in sync).
 */
export const theme: Record<ColorScheme, SemanticTokens> = {
  light: {
    background: colors.neutral[50],
    foreground: colors.neutral[900],
    card: colors.white,
    cardForeground: colors.neutral[900],
    muted: colors.neutral[100],
    mutedForeground: colors.neutral[500],
    border: colors.neutral[300],
    input: "#e1ded8",
    ring: colors.primary[600],
    accent: colors.primary[600],
    accentForeground: colors.white,
    destructive: colors.danger[500],
    destructiveForeground: colors.white,
    success: colors.success[600],
    warning: colors.warning[500],
  },
  dark: {
    background: colors.charcoal[950],
    foreground: colors.charcoal[50],
    card: colors.charcoal[900],
    cardForeground: colors.charcoal[50],
    muted: colors.neutral[800],
    mutedForeground: colors.neutral[400],
    border: colors.charcoal[800],
    input: colors.charcoal[700],
    ring: colors.primary[600],
    accent: colors.primary[600],
    accentForeground: colors.white,
    destructive: colors.danger[500],
    destructiveForeground: colors.white,
    success: colors.success[500],
    warning: colors.warning[400],
  },
} as const;

/** Resolve the semantic token set for a given color scheme. */
export function getThemeTokens(scheme: ColorScheme): SemanticTokens {
  return theme[scheme];
}
