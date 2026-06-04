import { captureException, isSentryEnabled } from "@/lib/sentry";

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

// Single funnel for handled errors → Sentry (no-op without a DSN) + dev console.
export function reportError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (__DEV__) {
    console.error("[reportError]", error, context ?? "");
  }
  captureException(toError(error), context ? { extra: context } : undefined);
}

let installed = false;

// Net for errors that escape React's boundary. No-op when Sentry is enabled —
// its default integrations already cover these and we'd double-report.
export function installGlobalErrorHandler(): void {
  if (installed || isSentryEnabled) {
    return;
  }
  installed = true;

  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, { origin: "uncaught", fatal: Boolean(isFatal) });
    previousHandler?.(error, isFatal);
  });

  try {
    const tracking = require("promise/setimmediate/rejection-tracking");
    tracking.enable({
      allRejections: true,
      onUnhandled: (_id: number, error: unknown) =>
        reportError(error, { origin: "unhandledRejection" }),
      onHandled: () => undefined,
    });
  } catch {
    // Tracker unavailable (non-Hermes or test env).
  }
}
