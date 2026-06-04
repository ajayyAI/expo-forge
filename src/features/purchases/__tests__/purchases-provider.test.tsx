import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { Text } from "@/components/ui";
import { cleanup, screen, setup } from "@/lib/test-utils";

// Mutable gate, swapped per test. `doMock` (unlike `mock`) is not hoisted, so it
// can close over this object, and we avoid `resetModules` — that would hand the
// provider a different React copy than renderHook's and break hooks.
const mockConfig = {
  PURCHASES_ENABLED: false,
  REVENUECAT_API_KEY: undefined as string | undefined,
  PRO_ENTITLEMENT_ID: "pro",
};
jest.doMock("../config", () => mockConfig);

const { PurchasesProvider } =
  require("../purchases-provider") as typeof import("../purchases-provider");
const { usePurchases } =
  require("../use-purchases") as typeof import("../use-purchases");

afterEach(cleanup);

const anonymousInfo = {
  entitlements: { active: {}, all: {} },
  originalAppUserId: "$RCAnonymousID:test",
};
const proCustomerInfo = {
  entitlements: { active: { pro: { identifier: "pro" } }, all: {} },
  originalAppUserId: "user-1",
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <PurchasesProvider>{children}</PurchasesProvider>
);

describe("PurchasesProvider (disabled)", () => {
  beforeEach(() => {
    mockConfig.PURCHASES_ENABLED = false;
    mockConfig.REVENUECAT_API_KEY = undefined;
  });
  afterEach(() => jest.clearAllMocks());

  it("renders children and exposes a disabled context", () => {
    const { result } = renderHook(() => usePurchases(), { wrapper });
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isReady).toBe(true);
    expect(result.current.isPro).toBe(false);
    expect(Purchases.configure).not.toHaveBeenCalled();
  });

  it("passes children through", () => {
    setup(
      <PurchasesProvider>
        <Text>child</Text>
      </PurchasesProvider>
    );
    expect(screen.getByText("child")).toBeOnTheScreen();
  });
});

describe("PurchasesProvider (enabled)", () => {
  beforeEach(() => {
    mockConfig.PURCHASES_ENABLED = true;
    mockConfig.REVENUECAT_API_KEY = "appl_test";
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(anonymousInfo);
    (Purchases.getOfferings as jest.Mock).mockResolvedValue({
      current: null,
      all: {},
    });
  });
  afterEach(() => jest.clearAllMocks());

  async function renderReady() {
    const { result } = renderHook(() => usePurchases(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    return result;
  }

  it("configures the SDK and derives isPro from active entitlements", async () => {
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValue(proCustomerInfo);
    const result = await renderReady();

    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: "appl_test" });
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isPro).toBe(true);
  });

  it("resolves purchasePackage to false when the user cancels", async () => {
    const result = await renderReady();
    (Purchases.purchasePackage as jest.Mock).mockRejectedValueOnce({
      userCancelled: true,
    });

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.purchasePackage({} as never);
    });
    expect(outcome).toBe(false);
  });

  it("rethrows non-cancel purchase errors", async () => {
    const result = await renderReady();
    (Purchases.purchasePackage as jest.Mock).mockRejectedValueOnce(
      new Error("boom")
    );

    await act(async () => {
      await expect(result.current.purchasePackage({} as never)).rejects.toThrow(
        "boom"
      );
    });
  });

  it("restore reflects active entitlements", async () => {
    const result = await renderReady();
    (Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce(
      proCustomerInfo
    );

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.restore();
    });
    expect(outcome).toBe(true);
  });

  it("forgetUser skips logOut for an anonymous user", async () => {
    const result = await renderReady();
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(
      anonymousInfo
    );

    await act(async () => {
      await result.current.forgetUser();
    });
    expect(Purchases.logOut).not.toHaveBeenCalled();
  });

  it("forgetUser logs out an identified user", async () => {
    const result = await renderReady();
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce({
      originalAppUserId: "user-123",
    });
    (Purchases.logOut as jest.Mock).mockResolvedValueOnce(anonymousInfo);

    await act(async () => {
      await result.current.forgetUser();
    });
    expect(Purchases.logOut).toHaveBeenCalled();
  });

  it("presentPaywall refreshes and returns true after a purchase", async () => {
    const result = await renderReady();
    (RevenueCatUI.presentPaywall as jest.Mock).mockResolvedValueOnce(
      PAYWALL_RESULT.PURCHASED
    );
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(
      proCustomerInfo
    );

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.presentPaywall();
    });
    expect(outcome).toBe(true);
  });
});
