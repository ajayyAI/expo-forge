import { translate } from "@/lib/i18n";
import { cleanup, screen, setup, waitFor } from "@/lib/test-utils";
import type { PurchasesContextValue } from "../purchases-provider";

const mockCaptureException = jest.fn();
jest.mock("@/lib/sentry", () => ({ captureException: mockCaptureException }));

const mockShowErrorMessage = jest.fn();
jest.mock("@/components/ui", () => ({
  ...jest.requireActual("@/components/ui"),
  showErrorMessage: mockShowErrorMessage,
}));

const mockUsePurchases = jest.fn<PurchasesContextValue, []>();
jest.mock("../use-purchases", () => ({
  usePurchases: () => mockUsePurchases(),
}));

// Stack.Screen only sets navigation options; render it inert here.
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: { Screen: () => null },
}));

const { PaywallScreen } =
  require("../paywall-screen") as typeof import("../paywall-screen");

const baseContext: PurchasesContextValue = {
  isEnabled: true,
  isReady: true,
  isPro: false,
  customerInfo: null,
  offerings: null,
  currentOffering: null,
  refresh: () => Promise.resolve(),
  purchasePackage: () => Promise.resolve(false),
  restore: () => Promise.resolve(false),
  presentPaywall: () => Promise.resolve(false),
  identify: () => Promise.resolve(),
  forgetUser: () => Promise.resolve(),
};

function mockContext(overrides: Partial<PurchasesContextValue>) {
  mockUsePurchases.mockReturnValue({ ...baseContext, ...overrides });
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("PaywallScreen", () => {
  it("shows the not-configured surface when purchases are disabled", () => {
    mockContext({ isEnabled: false });
    setup(<PaywallScreen />);
    expect(screen.getByTestId("paywall-disabled")).toBeOnTheScreen();
  });

  it("offers an upgrade for a free user", () => {
    mockContext({ isPro: false });
    setup(<PaywallScreen />);
    expect(screen.getByTestId("paywall-upgrade")).toBeOnTheScreen();
    expect(screen.queryByText(translate("purchases.pro_active"))).toBeNull();
  });

  it("confirms pro status and hides the upgrade for a pro user", () => {
    mockContext({ isPro: true });
    setup(<PaywallScreen />);
    expect(
      screen.getByText(translate("purchases.pro_active"))
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("paywall-upgrade")).toBeNull();
  });

  it("reports a failed restore through Sentry and the error toast", async () => {
    mockContext({ restore: () => Promise.reject(new Error("boom")) });
    const { user } = setup(<PaywallScreen />);

    await user.press(screen.getByTestId("paywall-restore"));

    await waitFor(() => expect(mockCaptureException).toHaveBeenCalled());
    expect(mockShowErrorMessage).toHaveBeenCalledWith(
      translate("purchases.error")
    );
  });
});
