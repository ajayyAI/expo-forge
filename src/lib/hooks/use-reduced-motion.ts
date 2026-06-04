// Single seam for the OS "reduce motion" setting. Reanimated 4's hook is the
// source of truth: it's worklet-aware, and its web build reads
// `matchMedia('(prefers-reduced-motion)')`, so this stays correct on native and
// web without an RN AccessibilityInfo fallback. Re-exported (not re-implemented)
// so callers depend on this module, not reanimated directly.
// Note: on native this snapshots the OS setting at launch — it does NOT
// re-render when the user toggles "reduce motion" mid-session.
export { useReducedMotion } from "react-native-reanimated";
