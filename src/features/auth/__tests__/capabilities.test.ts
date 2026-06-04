/**
 * Capability checks decide which auth methods the UI may offer. The rules are
 * driven by env (which providers are configured) and platform (Apple is iOS
 * only). These tests pin that contract before the auth screens consume it.
 */

// Mutable Platform.OS so each case can simulate ios / android / web.
let mockPlatformOS: "ios" | "android" | "web" = "ios";
jest.mock("react-native", () => ({
  get Platform() {
    return { OS: mockPlatformOS };
  },
}));

let mockEnv = {};

jest.mock("env", () => ({
  __esModule: true,
  get default() {
    return mockEnv;
  },
  readPublicBooleanFlag: (value: string | undefined) =>
    value === "true" || value === "1",
}));

// Import after the mock + env helpers are in place.
function loadCapabilities() {
  let api: typeof import("../capabilities");
  jest.isolateModules(() => {
    api = require("../capabilities");
  });
  // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside isolateModules.
  return api!;
}

describe("getAvailableAuthMethods", () => {
  beforeEach(() => {
    mockEnv = {};
    mockPlatformOS = "ios";
  });

  it("always offers emailOTP (passwordless default)", () => {
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).toContain("emailOTP");
  });

  it("excludes email + password by default", () => {
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).not.toContain("email");
  });

  it("includes email + password when the flag is set", () => {
    mockEnv = { EXPO_PUBLIC_PASSWORD_AUTH_ENABLED: "true" };
    const { getAvailableAuthMethods, isPasswordAuthEnabled } =
      loadCapabilities();
    expect(getAvailableAuthMethods()).toContain("email");
    expect(isPasswordAuthEnabled()).toBe(true);
  });

  it("excludes google when no Google env is set", () => {
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).not.toContain("google");
  });

  it("includes google on web when the web client id is set", () => {
    mockPlatformOS = "web";
    mockEnv = { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "web-client-id" };
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).toContain("google");
  });

  it("includes google on iOS when the ios client id is set", () => {
    mockPlatformOS = "ios";
    mockEnv = { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "ios-client-id" };
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).toContain("google");
  });

  it("excludes google on iOS when only the web client id is set (no native id)", () => {
    mockPlatformOS = "ios";
    mockEnv = { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: "web-client-id" };
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).not.toContain("google");
  });

  it("includes google on Android when the android client id is set", () => {
    mockPlatformOS = "android";
    mockEnv = { EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: "android-client-id" };
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).toContain("google");
  });

  it("includes apple on iOS when Apple is configured", () => {
    mockPlatformOS = "ios";
    mockEnv = { EXPO_PUBLIC_APPLE_AUTH_ENABLED: "true" };
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).toContain("apple");
  });

  it("excludes apple on Android even when Apple is configured", () => {
    mockPlatformOS = "android";
    mockEnv = { EXPO_PUBLIC_APPLE_AUTH_ENABLED: "true" };
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).not.toContain("apple");
  });

  it("excludes apple on web even when Apple is configured", () => {
    mockPlatformOS = "web";
    mockEnv = { EXPO_PUBLIC_APPLE_AUTH_ENABLED: "true" };
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).not.toContain("apple");
  });

  it("excludes apple on iOS when Apple is not configured", () => {
    mockPlatformOS = "ios";
    const { getAvailableAuthMethods } = loadCapabilities();
    expect(getAvailableAuthMethods()).not.toContain("apple");
  });
});

describe("getAppStoreComplianceWarning", () => {
  beforeEach(() => {
    mockEnv = {};
    mockPlatformOS = "ios";
  });

  it("warns on iOS when Google is configured but Apple is not", () => {
    mockPlatformOS = "ios";
    mockEnv = { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "ios-client-id" };
    const { getAppStoreComplianceWarning } = loadCapabilities();
    const warning = getAppStoreComplianceWarning();
    expect(warning).not.toBeNull();
    expect(warning).toContain("4.8");
  });

  it("returns null on iOS when both Google and Apple are configured", () => {
    mockPlatformOS = "ios";
    mockEnv = {
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: "ios-client-id",
      EXPO_PUBLIC_APPLE_AUTH_ENABLED: "true",
    };
    const { getAppStoreComplianceWarning } = loadCapabilities();
    expect(getAppStoreComplianceWarning()).toBeNull();
  });

  it("returns null on Android even when Google is configured and Apple is off", () => {
    mockPlatformOS = "android";
    mockEnv = { EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: "android-client-id" };
    const { getAppStoreComplianceWarning } = loadCapabilities();
    expect(getAppStoreComplianceWarning()).toBeNull();
  });

  it("returns null on iOS when Google is not configured", () => {
    mockPlatformOS = "ios";
    const { getAppStoreComplianceWarning } = loadCapabilities();
    expect(getAppStoreComplianceWarning()).toBeNull();
  });
});
