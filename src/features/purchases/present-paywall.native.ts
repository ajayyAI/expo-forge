import type { PurchasesOffering } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import type { PaywallPresentation } from "./present-paywall";

export type { PaywallPresentation } from "./present-paywall";

function normalize(result: PAYWALL_RESULT): PaywallPresentation {
  if (
    result === PAYWALL_RESULT.PURCHASED ||
    result === PAYWALL_RESULT.RESTORED
  ) {
    return "purchased";
  }
  if (result === PAYWALL_RESULT.CANCELLED) {
    return "cancelled";
  }
  return "not_presented";
}

export async function presentPaywall(
  offering?: PurchasesOffering
): Promise<PaywallPresentation> {
  return normalize(
    await RevenueCatUI.presentPaywall(offering ? { offering } : {})
  );
}
