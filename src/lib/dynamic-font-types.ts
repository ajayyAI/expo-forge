import type { font } from "@expo/ui/swift-ui/modifiers";

/**
 * Shared types for the platform-split `dynamic-font` module.
 *
 * This file only carries TYPE imports from `@expo/ui` — types are erased at
 * build time, so the `@expo/ui` barrel (which runs `requireNativeModule`) is
 * never bundled by Metro on any platform. Both `dynamic-font.ts` (non-iOS
 * fallback) and `dynamic-font.ios.ts` (real implementation) reuse these types
 * to keep their exported signatures identical.
 */

/** Parameters accepted by the `@expo/ui/swift-ui` `font(...)` modifier. */
export type FontParams = Parameters<typeof font>[0];

/** Weight subset of {@link FontParams}. */
export type FontWeight = NonNullable<FontParams["weight"]>;

/**
 * A modifier produced by the `font(...)` factory. On iOS this is a real
 * `@expo/ui` modifier; on other platforms it is `undefined` (no-op).
 */
export type DynamicFontModifier = ReturnType<typeof font> | undefined;

/**
 * Signature of the hook returned by `useDynamicFont`: takes the same params as
 * the `@expo/ui` `font(...)` modifier and returns a modifier (iOS) or
 * `undefined` (non-iOS passthrough).
 */
export type DynamicFontFn = (params: FontParams) => DynamicFontModifier;
