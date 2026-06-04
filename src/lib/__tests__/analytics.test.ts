/**
 * Pins the adapter contract: `track`/`identify`/`reset` delegate to the active
 * adapter, which logs in dev and no-ops in prod. The dev/prod branch is chosen
 * at module load from `__DEV__`, so each case sets the flag and re-requires the
 * module under a fresh registry.
 *
 * sentry.test.ts uses resetModules because it branches on process.env; here
 * __DEV__ must be set before require(), so isolateModules is needed instead.
 */

type Analytics = typeof import("../analytics");

// `__DEV__` is a `declare const` in RN's types, so it isn't writable via the
// bare identifier; the runtime global is mutable, so reach it through a typed
// handle to flip the branch the module reads at load.
const devGlobal = globalThis as unknown as { __DEV__: boolean };

function loadAnalytics(dev: boolean): Analytics {
  let api: Analytics;
  jest.isolateModules(() => {
    devGlobal.__DEV__ = dev;
    api = require("../analytics");
  });
  // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside isolateModules.
  return api!;
}

describe("analytics", () => {
  let logSpy: jest.SpyInstance;
  const originalDev = devGlobal.__DEV__;

  beforeEach(() => {
    devGlobal.__DEV__ = originalDev;
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    devGlobal.__DEV__ = originalDev;
  });

  describe("dev adapter", () => {
    it("logs track events with properties", () => {
      const { track } = loadAnalytics(true);
      track("button_pressed", { id: "cta" });
      expect(logSpy).toHaveBeenCalledWith(
        "[analytics] track",
        "button_pressed",
        { id: "cta" }
      );
    });

    it("logs identify and reset", () => {
      const { identify, reset } = loadAnalytics(true);
      identify("user-1", { plan: "free" });
      reset();
      expect(logSpy).toHaveBeenCalledWith("[analytics] identify", "user-1", {
        plan: "free",
      });
      expect(logSpy).toHaveBeenCalledWith("[analytics] reset");
    });
  });

  describe("prod adapter", () => {
    it("no-ops track/identify/reset (nothing logged)", () => {
      const { track, identify, reset } = loadAnalytics(false);
      track("button_pressed", { id: "cta" });
      identify("user-1");
      reset();
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
