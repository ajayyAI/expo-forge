import { useContext } from "react";
import {
  PurchasesContext,
  type PurchasesContextValue,
} from "./purchases-provider";

export function usePurchases(): PurchasesContextValue {
  const context = useContext(PurchasesContext);
  if (!context) {
    throw new Error("usePurchases must be used within a PurchasesProvider");
  }
  return context;
}
