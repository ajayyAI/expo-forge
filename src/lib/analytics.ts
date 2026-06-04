/**
 * Custom-event analytics, backend-swappable.
 *
 * EAS Insights (the autolinked `expo-insights` dependency) handles automatic
 * install/usage telemetry in real/EAS builds. This module is the separate seam
 * for *custom* events you fire yourself: `track`, `identify`, `reset` over a
 * pluggable adapter.
 *
 * Default adapter: no-op in production, console-logs in dev (`__DEV__`), so
 * events are verifiable locally with zero setup and zero cost in shipped
 * builds. Swap in a real backend (e.g. PostHog) by replacing `adapter` below —
 * the call sites never change.
 *
 * To remove custom analytics entirely: delete this file and its call sites.
 * (EAS Insights is independent — `bun remove expo-insights` to drop it.)
 */

type Properties = Record<string, unknown>;

interface AnalyticsAdapter {
  track(event: string, properties?: Properties): void;
  identify(userId: string, traits?: Properties): void;
  reset(): void;
}

const devAdapter: AnalyticsAdapter = {
  track(event, properties) {
    console.log("[analytics] track", event, properties ?? {});
  },
  identify(userId, traits) {
    console.log("[analytics] identify", userId, traits ?? {});
  },
  reset() {
    console.log("[analytics] reset");
  },
};

const noopAdapter: AnalyticsAdapter = {
  track: () => undefined,
  identify: () => undefined,
  reset: () => undefined,
};

// To use PostHog: `bun add posthog-react-native`, gate on
// EXPO_PUBLIC_POSTHOG_KEY, and point this at a PostHog-backed adapter.
const adapter: AnalyticsAdapter = __DEV__ ? devAdapter : noopAdapter;

/** Record a custom event with optional properties. */
export function track(event: string, properties?: Properties): void {
  adapter.track(event, properties);
}

/** Associate subsequent events with a user (call after sign-in). */
export function identify(userId: string, traits?: Properties): void {
  adapter.identify(userId, traits);
}

/** Clear the identified user (call on sign-out). */
export function reset(): void {
  adapter.reset();
}
