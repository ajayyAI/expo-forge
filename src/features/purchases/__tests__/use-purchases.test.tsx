import { renderHook } from "@testing-library/react-native";
import { usePurchases } from "../use-purchases";

describe("usePurchases", () => {
  it("throws when used outside a PurchasesProvider", () => {
    expect(() => renderHook(() => usePurchases())).toThrow(
      "usePurchases must be used within a PurchasesProvider"
    );
  });
});
