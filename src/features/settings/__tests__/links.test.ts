/**
 * The optional Settings link rows are env-gated: a row only appears when its
 * public env var is set, so users never see a dead-end row. These tests pin
 * that contract.
 */

const LINK_ENV_KEYS = [
  "EXPO_PUBLIC_SUPPORT_EMAIL",
  "EXPO_PUBLIC_GITHUB_URL",
  "EXPO_PUBLIC_WEBSITE_URL",
] as const;

function clearLinkEnv() {
  for (const key of LINK_ENV_KEYS) {
    delete process.env[key];
  }
}

function loadLinks() {
  let api: typeof import("../links");
  jest.isolateModules(() => {
    api = require("../links");
  });
  // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside isolateModules.
  return api!;
}

describe("settings links visibility", () => {
  beforeEach(() => {
    clearLinkEnv();
  });

  it("hides all optional rows when no env is set", () => {
    const { getVisibleSettingsLinks, isSupportVisible } = loadLinks();
    expect(getVisibleSettingsLinks()).toEqual([]);
    expect(isSupportVisible()).toBe(false);
  });

  it("shows support only when the support email is set", () => {
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL = "help@example.com";
    const { isSupportVisible, getSupportEmail } = loadLinks();
    expect(isSupportVisible()).toBe(true);
    expect(getSupportEmail()).toBe("help@example.com");
  });

  it("treats a blank/whitespace env value as unset", () => {
    process.env.EXPO_PUBLIC_GITHUB_URL = "   ";
    const { getVisibleSettingsLinks } = loadLinks();
    expect(getVisibleSettingsLinks()).toEqual([]);
  });

  it("shows github when its url is set", () => {
    process.env.EXPO_PUBLIC_GITHUB_URL = "https://github.com/acme/app";
    const { getVisibleSettingsLinks } = loadLinks();
    expect(getVisibleSettingsLinks()).toEqual(["github"]);
  });

  it("shows website when its url is set", () => {
    process.env.EXPO_PUBLIC_WEBSITE_URL = "https://example.com";
    const { getVisibleSettingsLinks } = loadLinks();
    expect(getVisibleSettingsLinks()).toEqual(["website"]);
  });

  it("orders github before website when both are set", () => {
    process.env.EXPO_PUBLIC_GITHUB_URL = "https://github.com/acme/app";
    process.env.EXPO_PUBLIC_WEBSITE_URL = "https://example.com";
    const { getVisibleSettingsLinks } = loadLinks();
    expect(getVisibleSettingsLinks()).toEqual(["github", "website"]);
  });
});
