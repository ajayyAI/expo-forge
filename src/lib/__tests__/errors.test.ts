/**
 * `reportError` is the single funnel to Sentry; the global handler is a net for
 * errors that escape React's boundary and must step aside when Sentry owns
 * them. `isSentryEnabled` is read at module load, so each case re-requires the
 * module under a fresh registry with a mocked sentry seam.
 */

interface SentryMock {
  captureException: jest.Mock;
  isSentryEnabled: boolean;
}

function load(isSentryEnabled: boolean): {
  errors: typeof import("../errors");
  captureException: jest.Mock;
  enable: jest.Mock;
} {
  jest.resetModules();
  const captureException = jest.fn();
  const enable = jest.fn();
  jest.doMock(
    "@/lib/sentry",
    (): SentryMock => ({ captureException, isSentryEnabled })
  );
  jest.doMock("promise/setimmediate/rejection-tracking", () => ({ enable }));
  const errors = require("../errors") as typeof import("../errors");
  return { errors, captureException, enable };
}

describe("reportError", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.dontMock("@/lib/sentry");
  });

  it("wraps non-Error values before forwarding to Sentry", () => {
    const { errors, captureException } = load(false);
    errors.reportError("boom");
    const [forwarded] = captureException.mock.calls[0];
    expect(forwarded).toBeInstanceOf(Error);
    expect((forwarded as Error).message).toBe("boom");
  });

  it("passes Error instances through and attaches context as extra", () => {
    const { errors, captureException } = load(false);
    const original = new Error("nope");
    errors.reportError(original, { queryKey: "x" });
    expect(captureException).toHaveBeenCalledWith(original, {
      extra: { queryKey: "x" },
    });
  });
});

describe("installGlobalErrorHandler", () => {
  let previous: ((error: Error, isFatal?: boolean) => void) | undefined;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    previous = ErrorUtils.getGlobalHandler();
  });
  afterEach(() => {
    if (previous) {
      ErrorUtils.setGlobalHandler(previous);
    }
    jest.restoreAllMocks();
    jest.dontMock("@/lib/sentry");
  });

  it("routes uncaught errors and rejections through reportError when Sentry is off", () => {
    const { errors, captureException, enable } = load(false);
    // The default RN test handler rethrows; chain onto a noop so the wrapper's
    // pass-through stays harmless.
    ErrorUtils.setGlobalHandler(() => undefined);
    errors.installGlobalErrorHandler();

    const uncaught = new Error("fatal");
    ErrorUtils.getGlobalHandler()(uncaught, true);
    expect(captureException).toHaveBeenCalledWith(uncaught, {
      extra: { origin: "uncaught", fatal: true },
    });

    const { onUnhandled } = enable.mock.calls[0][0];
    const rejected = new Error("dropped");
    onUnhandled(1, rejected);
    expect(captureException).toHaveBeenCalledWith(rejected, {
      extra: { origin: "unhandledRejection" },
    });
  });

  it("leaves the global handler untouched when Sentry is enabled", () => {
    const { errors, enable } = load(true);
    const before = ErrorUtils.getGlobalHandler();
    errors.installGlobalErrorHandler();
    expect(ErrorUtils.getGlobalHandler()).toBe(before);
    expect(enable).not.toHaveBeenCalled();
  });
});
