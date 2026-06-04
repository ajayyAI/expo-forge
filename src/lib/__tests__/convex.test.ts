/**
 * The backend (Convex + Better Auth) is optional and off by default. These
 * tests cover the startup contract: no/invalid/partial config stays inert;
 * complete config creates the real client.
 */

const mockConstruct = jest.fn();

jest.mock("convex/react", () => ({
  ConvexReactClient: class {
    constructor(...args: unknown[]) {
      mockConstruct(...args);
    }
  },
  useQuery: () => "real-query",
  useMutation: () => () => Promise.resolve("real-mutation"),
  useAction: () => () => Promise.resolve("real-action"),
  useConvexAuth: () => ({ isLoading: true, isAuthenticated: true }),
}));

beforeEach(() => {
  jest.resetModules();
  mockConstruct.mockClear();
});

function loadConvex(env: { convexUrl?: string; authSiteUrl?: string } = {}) {
  jest.doMock("env", () => ({
    __esModule: true,
    readOptionalPublicHttpUrl: (value: string | undefined) => {
      if (!value) {
        return undefined;
      }
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:"
          ? value
          : undefined;
      } catch {
        return undefined;
      }
    },
    default: {
      EXPO_PUBLIC_CONVEX_URL: env.convexUrl,
      EXPO_PUBLIC_CONVEX_SITE_URL: env.authSiteUrl,
    },
  }));
  return require("../convex");
}

describe("convex backend gating", () => {
  it("stays disabled with no URL: null client, no construction, inert hooks", async () => {
    const mod = loadConvex();

    expect(mod.BACKEND_ENABLED).toBe(false);
    expect(mod.convexClient).toBeNull();
    expect(mockConstruct).not.toHaveBeenCalled();

    // Called bare here; consumers pass real query/mutation refs. The cast keeps
    // the production signature strict without dragging it into the assertion.
    const useQuery = mod.useQuery as () => unknown;
    const useMutation =
      mod.useMutation as unknown as () => () => Promise<unknown>;
    const useAction = mod.useAction as unknown as () => () => Promise<unknown>;

    expect(useQuery()).toBeUndefined();
    expect(mod.useConvexAuth()).toEqual({
      isLoading: false,
      isAuthenticated: false,
    });
    await expect(useMutation()()).rejects.toThrow("EXPO_PUBLIC_CONVEX_URL");
    await expect(useAction()()).rejects.toThrow("EXPO_PUBLIC_CONVEX_URL");
  });

  it.each([
    {
      name: "invalid Convex URL",
      convexUrl: "htttps://invalid.example.convex.cloud",
      authSiteUrl: "https://auth.example.convex.site",
    },
    {
      name: "missing Better Auth site URL",
      convexUrl: "https://example.convex.cloud",
    },
    {
      name: "missing Convex cloud URL",
      authSiteUrl: "https://auth.example.convex.site",
    },
  ])("stays disabled for $name", (env) => {
    const mod = loadConvex(env);

    expect(mod.BACKEND_ENABLED).toBe(false);
    expect(mod.convexClient).toBeNull();
    expect(mockConstruct).not.toHaveBeenCalled();
  });

  it("enables with both backend URLs", async () => {
    const mod = loadConvex({
      convexUrl: "https://example.convex.cloud",
      authSiteUrl: "https://auth.example.convex.site",
    });

    expect(mod.BACKEND_ENABLED).toBe(true);
    expect(mockConstruct).toHaveBeenCalledWith("https://example.convex.cloud", {
      unsavedChangesWarning: false,
    });
    expect((mod.useQuery as () => unknown)()).toBe("real-query");
    expect(mod.useConvexAuth()).toEqual({
      isLoading: true,
      isAuthenticated: true,
    });

    const useAction = mod.useAction as unknown as () => () => Promise<unknown>;
    await expect(useAction()()).resolves.toBe("real-action");
  });
});
