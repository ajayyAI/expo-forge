/**
 * Platform-gated native-polish UI tier.
 *
 * Each component has one cross-platform API and degrades gracefully:
 * - `Icon`    — SF Symbols on iOS, Material icons on Android/web.
 * - `Surface` — liquid glass on iOS, blur+elevation on Android, card on web.
 * - `SegmentedControl` — native SwiftUI/Compose control, RN fallback on web.
 *
 * The `./icon` and `./surface` specifiers below are intentionally
 * extension-less so Metro resolves the correct `.ios.tsx` / `.android.tsx` /
 * `.tsx` variant per platform. Native-only modules (`expo-symbols`,
 * `expo-glass-effect`) are imported ONLY from `.ios.tsx` files and never leak
 * into the web or Android bundle.
 */
export { Icon } from "./icon";
export type { IconName, IconProps } from "./icon-map";
export {
  SegmentedControl,
  type SegmentedControlProps,
} from "./segmented-control";
export { Surface } from "./surface";
export { SURFACE_CARD_CLASS, type SurfaceProps } from "./surface-types";
