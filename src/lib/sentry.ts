/**
 * Sentry crash/error reporting.
 *
 * Off by default: with no `EXPO_PUBLIC_SENTRY_DSN` set, `initSentry` is a
 * complete no-op and the SDK is never started. Public config is read through
 * the root env contract.
 *
 * To remove Sentry entirely: delete this file, its `initSentry()`/`Sentry.wrap`
 * seam in src/app/_layout.tsx, the env entry, and the config plugin in
 * app.config.ts.
 */

import * as Sentry from "@sentry/react-native";
import Env from "env";
import type * as React from "react";

const dsn = Env.EXPO_PUBLIC_SENTRY_DSN;

// When enabled, Sentry's default integrations already install global error +
// unhandled-rejection handlers (see installGlobalErrorHandler).
export const isSentryEnabled = Boolean(dsn);

export function initSentry(): void {
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    // Only trace in production; off-prod tracing is noise and burns quota.
    tracesSampleRate: Env.EXPO_PUBLIC_APP_ENV === "production" ? 0.2 : 0,
  });
}

/**
 * Wraps the root component for navigation instrumentation and touch event
 * breadcrumbs. Pass-through when no DSN is configured so the tree is untouched.
 */
export function wrapWithSentry<P extends Record<string, unknown>>(
  RootComponent: React.ComponentType<P>
): React.ComponentType<P> {
  return dsn ? Sentry.wrap(RootComponent) : RootComponent;
}

const noop = (..._args: unknown[]) => undefined;
export const captureException = dsn ? Sentry.captureException : noop;
export const captureMessage = dsn ? Sentry.captureMessage : noop;
