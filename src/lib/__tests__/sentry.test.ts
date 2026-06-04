/**
 * Pins the no-op contract: Sentry only starts when a DSN is configured. `dsn`
 * is read at module load, so each case mutates the env and re-requires the
 * module under a fresh registry (mirrors the env+resetModules pattern in
 * src/features/auth/__tests__/capabilities.test.ts).
 */

describe("initSentry", () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  it("does not start Sentry when no DSN is set", () => {
    const Sentry = require("@sentry/react-native");
    const { initSentry } = require("../sentry");
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("starts Sentry when a DSN is set", () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN =
      "https://public@example.ingest.sentry.io/1";
    const Sentry = require("@sentry/react-native");
    const { initSentry } = require("../sentry");
    initSentry();
    expect(Sentry.init).toHaveBeenCalled();
  });
});
