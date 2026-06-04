/**
 * `BIOMETRIC_LOCK_ENABLED` is the build-time flag for the app-lock feature.
 * It mirrors the auth-required coercion: a module-load const read from
 * `EXPO_PUBLIC_BIOMETRIC_LOCK`, so these cases reset the env and re-require.
 */

function loadConfig() {
  let mod: typeof import("../config");
  jest.isolateModules(() => {
    mod = require("../config");
  });
  // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside isolateModules.
  return mod!;
}

describe("BIOMETRIC_LOCK_ENABLED", () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_BIOMETRIC_LOCK;
  });

  it('is true when the flag is "true"', () => {
    process.env.EXPO_PUBLIC_BIOMETRIC_LOCK = "true";
    expect(loadConfig().BIOMETRIC_LOCK_ENABLED).toBe(true);
  });

  it('is true when the flag is "1"', () => {
    process.env.EXPO_PUBLIC_BIOMETRIC_LOCK = "1";
    expect(loadConfig().BIOMETRIC_LOCK_ENABLED).toBe(true);
  });

  it("is false when the flag is absent (default off)", () => {
    expect(loadConfig().BIOMETRIC_LOCK_ENABLED).toBe(false);
  });

  it('is false for "false", "0", and garbage', () => {
    for (const value of ["false", "0", "yes", "TRUE", ""]) {
      process.env.EXPO_PUBLIC_BIOMETRIC_LOCK = value;
      expect(loadConfig().BIOMETRIC_LOCK_ENABLED).toBe(false);
    }
  });
});
