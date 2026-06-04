/**
 * Settings action handlers: these drive the OS share sheet, store review, and
 * the optional mailto/external-link rows. The tests assert each handler calls
 * the right platform API with the right target, and stays a no-op when its env
 * var is unset.
 */

let mockPlatformOS: "ios" | "android" | "web" = "ios";
const mockShare = jest.fn();
const mockOpenURL = jest.fn();

jest.mock("react-native", () => ({
  get Platform() {
    return { OS: mockPlatformOS };
  },
  Share: { share: (...args: unknown[]) => mockShare(...args) },
  Linking: {
    openURL: (...args: unknown[]) => mockOpenURL(...args),
  },
}));

const mockIsAvailable = jest.fn();
const mockRequestReview = jest.fn();
jest.mock("expo-store-review", () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailable(...args),
  requestReview: (...args: unknown[]) => mockRequestReview(...args),
}));

const mockShowError = jest.fn();
jest.mock("@/components/ui/utils", () => ({
  showErrorMessage: (...args: unknown[]) => mockShowError(...args),
}));

jest.mock("env", () => ({
  __esModule: true,
  get default() {
    return {
      EXPO_PUBLIC_NAME: "Acme",
      EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
      EXPO_PUBLIC_GITHUB_URL: process.env.EXPO_PUBLIC_GITHUB_URL,
      EXPO_PUBLIC_WEBSITE_URL: process.env.EXPO_PUBLIC_WEBSITE_URL,
    };
  },
  readOptionalPublicString: (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  },
}));

jest.mock("@/lib/i18n", () => ({
  translate: (key: string, opts?: Record<string, unknown>) =>
    opts ? `${key}:${JSON.stringify(opts)}` : key,
}));

const LINK_ENV_KEYS = [
  "EXPO_PUBLIC_SUPPORT_EMAIL",
  "EXPO_PUBLIC_GITHUB_URL",
  "EXPO_PUBLIC_WEBSITE_URL",
] as const;

function loadActions() {
  let api: typeof import("../actions");
  jest.isolateModules(() => {
    api = require("../actions");
  });
  // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside isolateModules.
  return api!;
}

beforeEach(() => {
  mockPlatformOS = "ios";
  mockShare.mockReset().mockResolvedValue(undefined);
  mockOpenURL.mockReset().mockResolvedValue(undefined);
  mockIsAvailable.mockReset().mockResolvedValue(true);
  mockRequestReview.mockReset().mockResolvedValue(undefined);
  mockShowError.mockReset();
  for (const key of LINK_ENV_KEYS) {
    delete process.env[key];
  }
});

describe("shareApp", () => {
  it("opens the native share sheet with a message naming the app", async () => {
    const { shareApp } = loadActions();
    await shareApp();
    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare.mock.calls[0][0].message).toContain("Acme");
  });

  it("swallows a dismissed/failed share without throwing", async () => {
    mockShare.mockRejectedValueOnce(new Error("dismissed"));
    const { shareApp } = loadActions();
    await expect(shareApp()).resolves.toBeUndefined();
  });

  it("uses the Web Share API on web when available", async () => {
    mockPlatformOS = "web";
    const webShare = jest.fn().mockResolvedValue(undefined);
    (globalThis as { navigator?: unknown }).navigator = { share: webShare };
    const { shareApp } = loadActions();
    await shareApp();
    expect(webShare).toHaveBeenCalledTimes(1);
    expect(mockShare).not.toHaveBeenCalled();
    (globalThis as { navigator?: unknown }).navigator = undefined;
  });

  it("shows a notice on web when no share API exists", async () => {
    mockPlatformOS = "web";
    (globalThis as { navigator?: unknown }).navigator = {};
    const { shareApp } = loadActions();
    await shareApp();
    expect(mockShowError).toHaveBeenCalledTimes(1);
    (globalThis as { navigator?: unknown }).navigator = undefined;
  });
});

describe("rateApp", () => {
  it("requests review when store review is available", async () => {
    const { rateApp } = loadActions();
    await rateApp();
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it("does nothing when store review is unavailable", async () => {
    mockIsAvailable.mockResolvedValueOnce(false);
    const { rateApp } = loadActions();
    await rateApp();
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("swallows errors from the review API", async () => {
    mockIsAvailable.mockRejectedValueOnce(new Error("nope"));
    const { rateApp } = loadActions();
    await expect(rateApp()).resolves.toBeUndefined();
  });
});

describe("contactSupport", () => {
  it("opens a mailto: to the configured support email", async () => {
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = "help@example.com";
    const { contactSupport } = loadActions();
    await contactSupport();
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL.mock.calls[0][0]).toContain("mailto:help@example.com");
  });

  it("is a no-op when the support email is unset", async () => {
    const { contactSupport } = loadActions();
    await contactSupport();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });
});

describe("openGithub / openWebsite", () => {
  it("opens the configured GitHub url", async () => {
    process.env.EXPO_PUBLIC_GITHUB_URL = "https://github.com/acme/app";
    const { openGithub } = loadActions();
    await openGithub();
    expect(mockOpenURL).toHaveBeenCalledWith("https://github.com/acme/app");
  });

  it("opens the configured website url", async () => {
    process.env.EXPO_PUBLIC_WEBSITE_URL = "https://example.com";
    const { openWebsite } = loadActions();
    await openWebsite();
    expect(mockOpenURL).toHaveBeenCalledWith("https://example.com");
  });

  it("is a no-op when the url is unset", async () => {
    const { openGithub } = loadActions();
    await openGithub();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it("shows a notice when opening the url throws", async () => {
    process.env.EXPO_PUBLIC_WEBSITE_URL = "https://example.com";
    mockOpenURL.mockRejectedValueOnce(new Error("no handler"));
    const { openWebsite } = loadActions();
    await openWebsite();
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockShowError).toHaveBeenCalledTimes(1);
  });
});
