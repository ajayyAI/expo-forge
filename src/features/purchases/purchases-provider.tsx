/**
 * RevenueCat in-app purchases context.
 *
 * Off by default: with no platform API key set (or on web) the provider is a
 * pass-through that exposes a static disabled context, so the SDK is never
 * configured and a fresh clone stays inert. See ./config.ts for the gate.
 *
 * Identity is anonymous by default — RevenueCat persists an auto-generated app
 * user ID. This file deliberately does not import auth or Convex, keeping
 * purchases and auth independently removable. To tie RevenueCat to your own
 * accounts, call `identify(userId)` from an auth effect (and `forgetUser()` on
 * sign-out) in a consumer component.
 *
 * To remove in-app purchases entirely: delete src/features/purchases/, this
 * provider's mount in src/app/_layout.tsx, the paywall route + Stack.Screen, the
 * Settings row, the env entries, and the __mocks__ for both RevenueCat packages.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";
import { captureException } from "@/lib/sentry";
import { PRO_ENTITLEMENT_ID, REVENUECAT_API_KEY } from "./config";
import { presentPaywall as presentNativePaywall } from "./present-paywall";

export interface PurchasesContextValue {
  isEnabled: boolean;
  isReady: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  refresh: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  presentPaywall: () => Promise<boolean>;
  identify: (userId: string) => Promise<void>;
  forgetUser: () => Promise<void>;
}

function hasProEntitlement(info: CustomerInfo | null): boolean {
  return info?.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
}

// A user dismissing the store sheet is a normal choice, not an error. The SDK
// flags it via `userCancelled`, with the cancel error code as a fallback.
function isUserCancelled(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const e = error as { userCancelled?: boolean; code?: string };
  return (
    e.userCancelled === true ||
    e.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

const disabledValue: PurchasesContextValue = {
  isEnabled: false,
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

export const PurchasesContext = createContext<PurchasesContextValue | null>(
  null
);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  if (!REVENUECAT_API_KEY) {
    return (
      <PurchasesContext.Provider value={disabledValue}>
        {children}
      </PurchasesContext.Provider>
    );
  }
  return (
    <EnabledPurchasesProvider apiKey={REVENUECAT_API_KEY}>
      {children}
    </EnabledPurchasesProvider>
  );
}

function EnabledPurchasesProvider({
  apiKey,
  children,
}: {
  apiKey: string;
  children: ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);

  useEffect(() => {
    let active = true;

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    }
    Purchases.configure({ apiKey });

    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(listener);

    Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()])
      .then(([info, offers]) => {
        if (!active) {
          return;
        }
        setCustomerInfo(info);
        setOfferings(offers);
      })
      .catch(captureException)
      .finally(() => {
        if (active) {
          setIsReady(true);
        }
      });

    return () => {
      active = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [apiKey]);

  const refresh = useCallback(async () => {
    const [info, offers] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);
    setCustomerInfo(info);
    setOfferings(offers);
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      return hasProEntitlement(info);
    } catch (error) {
      if (isUserCancelled(error)) {
        return false;
      }
      throw error;
    }
  }, []);

  const restore = useCallback(async () => {
    const info = await Purchases.restorePurchases();
    setCustomerInfo(info);
    return hasProEntitlement(info);
  }, []);

  const presentPaywall = useCallback(async () => {
    const result = await presentNativePaywall(offerings?.current ?? undefined);
    if (result !== "purchased") {
      return false;
    }
    // The update listener also fires after a paywall purchase; this refresh
    // just surfaces the entitlement immediately rather than on the next event.
    try {
      await refresh();
    } catch (error) {
      captureException(error);
    }
    return true;
  }, [offerings, refresh]);

  const identify = useCallback(async (userId: string) => {
    const { customerInfo: info } = await Purchases.logIn(userId);
    setCustomerInfo(info);
  }, []);

  const forgetUser = useCallback(async () => {
    // logOut rejects while the SDK is anonymous, which it is until `identify`.
    const info = await Purchases.getCustomerInfo();
    if (info.originalAppUserId.startsWith("$RCAnonymousID:")) {
      return;
    }
    setCustomerInfo(await Purchases.logOut());
  }, []);

  const value = useMemo<PurchasesContextValue>(
    () => ({
      isEnabled: true,
      isReady,
      isPro: hasProEntitlement(customerInfo),
      customerInfo,
      offerings,
      currentOffering: offerings?.current ?? null,
      refresh,
      purchasePackage,
      restore,
      presentPaywall,
      identify,
      forgetUser,
    }),
    [
      isReady,
      customerInfo,
      offerings,
      refresh,
      purchasePackage,
      restore,
      presentPaywall,
      identify,
      forgetUser,
    ]
  );

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}
