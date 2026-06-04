import type { PurchasesOffering } from "react-native-purchases";

// Web stub. The `.native.ts` sibling carries the real implementation;
// `react-native-purchases-ui` is native-only and must stay out of the web bundle.
export type PaywallPresentation = "not_presented" | "purchased" | "cancelled";

export function presentPaywall(
  _offering?: PurchasesOffering
): Promise<PaywallPresentation> {
  return Promise.resolve("not_presented");
}
