// Jest stub for the native RevenueCat Paywall UI. Presenting resolves to
// NOT_PRESENTED by default; tests override per case.
export const PAYWALL_RESULT = {
  NOT_PRESENTED: "NOT_PRESENTED",
  ERROR: "ERROR",
  CANCELLED: "CANCELLED",
  PURCHASED: "PURCHASED",
  RESTORED: "RESTORED",
} as const;

const RevenueCatUI = {
  presentPaywall: jest.fn(() => Promise.resolve(PAYWALL_RESULT.NOT_PRESENTED)),
  presentPaywallIfNeeded: jest.fn(() =>
    Promise.resolve(PAYWALL_RESULT.NOT_PRESENTED)
  ),
  Paywall: () => null,
};

export default RevenueCatUI;
