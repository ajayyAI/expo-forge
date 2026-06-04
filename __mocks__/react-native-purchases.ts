// Jest stub for the native RevenueCat SDK. Defaults to a fresh user with no
// active entitlements; tests override return values per case.
const emptyCustomerInfo = {
  entitlements: { active: {}, all: {} },
  activeSubscriptions: [],
  allPurchasedProductIdentifiers: [],
  originalAppUserId: "$RCAnonymousID:test",
};

const Purchases = {
  configure: jest.fn(),
  setLogLevel: jest.fn(),
  getCustomerInfo: jest.fn(() => Promise.resolve(emptyCustomerInfo)),
  getOfferings: jest.fn(() => Promise.resolve({ current: null, all: {} })),
  purchasePackage: jest.fn(() =>
    Promise.resolve({ customerInfo: emptyCustomerInfo })
  ),
  restorePurchases: jest.fn(() => Promise.resolve(emptyCustomerInfo)),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(() => true),
  logIn: jest.fn(() =>
    Promise.resolve({ customerInfo: emptyCustomerInfo, created: false })
  ),
  logOut: jest.fn(() => Promise.resolve(emptyCustomerInfo)),
  PURCHASES_ERROR_CODE: {
    PURCHASE_CANCELLED_ERROR: "PURCHASE_CANCELLED_ERROR",
  },
  LOG_LEVEL: {
    VERBOSE: "VERBOSE",
    DEBUG: "DEBUG",
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
  },
};

export const LOG_LEVEL = Purchases.LOG_LEVEL;
export const PURCHASES_ERROR_CODE = Purchases.PURCHASES_ERROR_CODE;

export default Purchases;
