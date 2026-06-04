/**
 * Security contract: only trusted custom-scheme/universal-link inputs and bare
 * app paths may route. External, protocol-relative, and traversal inputs stay
 * null to avoid open redirects.
 */

import { resolveDeepLinkWithConfig } from "../deep-link";

const SCHEME = "expoforge";
const DOMAIN = "https://links.example.com";

describe("resolveDeepLink", () => {
  const resolveDeepLink = (
    url: unknown,
    config?: Partial<Parameters<typeof resolveDeepLinkWithConfig>[1]>
  ) =>
    resolveDeepLinkWithConfig(url, {
      appScheme: SCHEME,
      associatedDomain: DOMAIN,
      ...config,
    });

  describe("bare internal paths", () => {
    it("accepts a simple internal path", () => {
      expect(resolveDeepLink("/profile")).toBe("/profile");
    });

    it("accepts a nested internal path with query and hash", () => {
      expect(resolveDeepLink("/posts/42?ref=push#top")).toBe(
        "/posts/42?ref=push#top"
      );
    });

    it("accepts the root path", () => {
      expect(resolveDeepLink("/")).toBe("/");
    });

    it("rejects relative paths without a leading slash", () => {
      expect(resolveDeepLink("profile")).toBeNull();
    });

    it("rejects the empty string", () => {
      expect(resolveDeepLink("")).toBeNull();
    });

    it("rejects whitespace-only strings", () => {
      expect(resolveDeepLink("   ")).toBeNull();
    });

    it("rejects a leading-tab path", () => {
      expect(resolveDeepLink("\t/profile")).toBeNull();
    });

    it("rejects a leading-newline path", () => {
      expect(resolveDeepLink("\n/profile")).toBeNull();
    });

    it("rejects protocol-relative URLs", () => {
      expect(resolveDeepLink("//evil.com")).toBeNull();
    });

    it("rejects backslash-prefixed protocol-relative URLs", () => {
      expect(resolveDeepLink("/\\evil.com")).toBeNull();
    });

    it("rejects path traversal", () => {
      expect(resolveDeepLink("/../../etc/passwd")).toBeNull();
    });

    it("rejects percent-encoded path traversal", () => {
      expect(resolveDeepLink("/%2e%2e/x")).toBeNull();
    });
  });

  describe("external and foreign schemes", () => {
    it("rejects https URLs to a non-associated host", () => {
      expect(resolveDeepLink("https://evil.com/profile")).toBeNull();
    });

    it("rejects http URLs even to the associated host", () => {
      expect(resolveDeepLink("http://links.example.com/profile")).toBeNull();
    });

    it("rejects javascript: scheme", () => {
      expect(resolveDeepLink("javascript:alert(1)")).toBeNull();
    });

    it("rejects a foreign custom scheme", () => {
      expect(resolveDeepLink("otherapp://profile")).toBeNull();
    });
  });

  describe("non-string and empty inputs", () => {
    it("rejects non-string inputs", () => {
      expect(resolveDeepLink(undefined)).toBeNull();
      expect(resolveDeepLink(null)).toBeNull();
      expect(resolveDeepLink(42)).toBeNull();
      expect(resolveDeepLink({ url: "/profile" })).toBeNull();
    });
  });

  describe("custom-scheme URLs", () => {
    it("accepts a matching scheme and normalizes to an internal path", () => {
      expect(resolveDeepLink("expoforge://profile")).toBe("/profile");
    });

    it("accepts a matching scheme with a nested path", () => {
      expect(resolveDeepLink("expoforge://posts/42")).toBe("/posts/42");
    });

    it("preserves query and hash from a custom-scheme URL", () => {
      expect(resolveDeepLink("expoforge://posts/42?ref=x#top")).toBe(
        "/posts/42?ref=x#top"
      );
    });

    it("treats a triple-slashed scheme URL as a root-anchored path", () => {
      expect(resolveDeepLink("expoforge:///settings")).toBe("/settings");
    });

    it("resolves the bare scheme root to /", () => {
      expect(resolveDeepLink("expoforge://")).toBe("/");
    });

    it("resolves the triple-slashed scheme root to /", () => {
      expect(resolveDeepLink("expoforge:///")).toBe("/");
    });

    it("rejects custom-scheme links when no app scheme is configured", () => {
      expect(
        resolveDeepLink("expoforge:///", { appScheme: undefined })
      ).toBeNull();
    });

    it("rejects a scheme mismatch", () => {
      expect(
        resolveDeepLink("expoforge://profile", { appScheme: "different" })
      ).toBeNull();
    });

    it("matches the scheme case-insensitively", () => {
      expect(resolveDeepLink("EXPOFORGE://profile")).toBe("/profile");
    });

    it("rejects percent-encoded traversal before URL normalization", () => {
      expect(resolveDeepLink("expoforge://posts/%2e%2e/profile")).toBeNull();
    });
  });

  describe("universal links", () => {
    it("accepts a path on the associated-domain host", () => {
      expect(resolveDeepLink("https://links.example.com/profile")).toBe(
        "/profile"
      );
    });

    it("preserves query and hash from a universal link", () => {
      expect(
        resolveDeepLink("https://links.example.com/posts/42?ref=x#top")
      ).toBe("/posts/42?ref=x#top");
    });

    it("resolves the associated-domain root to /", () => {
      expect(resolveDeepLink("https://links.example.com")).toBe("/");
    });

    it("rejects a host that only suffix-matches the associated domain", () => {
      expect(
        resolveDeepLink("https://evil-links.example.com/profile")
      ).toBeNull();
    });

    it("rejects a subdomain of the associated host", () => {
      expect(resolveDeepLink("https://a.links.example.com/profile")).toBeNull();
    });

    it("matches the host case-insensitively", () => {
      expect(resolveDeepLink("https://LINKS.EXAMPLE.COM/profile")).toBe(
        "/profile"
      );
    });

    it("never matches when no associated domain is configured", () => {
      expect(
        resolveDeepLink("https://links.example.com/profile", {
          associatedDomain: undefined,
        })
      ).toBeNull();
    });

    it("never matches when the associated domain is not https", () => {
      expect(
        resolveDeepLink("https://links.example.com/profile", {
          associatedDomain: "http://links.example.com",
        })
      ).toBeNull();
    });

    it("never matches when the associated domain includes a port", () => {
      expect(
        resolveDeepLink("https://links.example.com:8443/profile", {
          associatedDomain: "https://links.example.com:8443",
        })
      ).toBeNull();
    });

    it("rejects percent-encoded traversal before URL normalization", () => {
      expect(
        resolveDeepLink("https://links.example.com/posts/%2e%2e/profile")
      ).toBeNull();
    });
  });

  describe("app env wrapper", () => {
    it("uses the default app scheme from Env", () => {
      jest.isolateModules(() => {
        jest.doMock("env", () => ({
          __esModule: true,
          default: {
            EXPO_PUBLIC_SCHEME: "expoforge",
            EXPO_PUBLIC_ASSOCIATED_DOMAIN: undefined,
          },
        }));

        const { resolveDeepLink } = require("../deep-link");
        expect(resolveDeepLink("expoforge:///")).toBe("/");
      });
    });
  });
});
