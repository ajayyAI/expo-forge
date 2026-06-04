/**
 * The purchases feature is env-gated: it stays a no-op on web and whenever the
 * platform API key is unset, so a fresh clone ships nothing extra. These tests
 * pin that contract and the entitlement-id resolution.
 */

const KEY_ENV = [
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID",
] as const;

function clearEnv() {
  for (const key of KEY_ENV) {
    delete process.env[key];
  }
}

function loadConfig(platform: "ios" | "android" | "web") {
  let api: typeof import("../config");
  jest.isolateModules(() => {
    const { Platform } = require("react-native");
    Platform.OS = platform;
    Platform.select = (spec: Record<string, unknown>) =>
      spec[platform] ?? spec.default ?? spec.native;
    api = require("../config");
  });
  // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside isolateModules.
  return api!;
}

describe("purchases config gating", () => {
  beforeEach(() => {
    clearEnv();
    jest.resetModules();
  });

  it("is disabled when no key is set", () => {
    const { PURCHASES_ENABLED } = loadConfig("ios");
    expect(PURCHASES_ENABLED).toBe(false);
  });

  it("is disabled on web even with keys set", () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = "appl_test";
    const { PURCHASES_ENABLED } = loadConfig("web");
    expect(PURCHASES_ENABLED).toBe(false);
  });

  it("enables on iOS with the iOS key set", () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = "appl_test";
    const { PURCHASES_ENABLED, REVENUECAT_API_KEY } = loadConfig("ios");
    expect(PURCHASES_ENABLED).toBe(true);
    expect(REVENUECAT_API_KEY).toBe("appl_test");
  });

  it("ignores the iOS key on Android", () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = "appl_test";
    const { PURCHASES_ENABLED } = loadConfig("android");
    expect(PURCHASES_ENABLED).toBe(false);
  });

  it("treats a blank key as unset", () => {
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = "   ";
    const { PURCHASES_ENABLED } = loadConfig("ios");
    expect(PURCHASES_ENABLED).toBe(false);
  });

  it("defaults the entitlement id to 'pro'", () => {
    const { PRO_ENTITLEMENT_ID } = loadConfig("ios");
    expect(PRO_ENTITLEMENT_ID).toBe("pro");
  });

  it("honors an entitlement-id override", () => {
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID = "premium";
    const { PRO_ENTITLEMENT_ID } = loadConfig("ios");
    expect(PRO_ENTITLEMENT_ID).toBe("premium");
  });
});
