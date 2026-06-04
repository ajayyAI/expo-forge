// Mock react-native-worklets first
jest.mock("react-native-worklets", () => ({
  __esModule: true,
  default: {},
}));

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const View = require("react-native").View;

  // A self-returning stub so layout-animation builders can be chained in tests.
  const chainableAnimation = () => {
    const builder: Record<string, () => unknown> = {};
    for (const method of ["duration", "delay", "springify", "easing"]) {
      builder[method] = () => builder;
    }
    return builder;
  };

  return {
    __esModule: true,
    default: {
      View,
      ScrollView: View,
      // biome-ignore lint/suspicious/noExplicitAny: test mock mirrors reanimated's createAnimatedComponent passthrough; typing the generic component arg adds no value in a jest stub.
      createAnimatedComponent: (component: any) => component,
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useReducedMotion: jest.fn(() => false),
    useAnimatedStyle: jest.fn((fn) => fn()),
    interpolate: jest.fn((_value, _input, output) => output.at(-1)),
    interpolateColor: jest.fn((_value, _input, output) => output.at(-1)),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDecay: jest.fn((value) => value),
    withDelay: jest.fn((_, value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[0]),
    cancelAnimation: jest.fn(),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      bezier: jest.fn(),
      in: jest.fn((fn) => fn),
      out: jest.fn((fn) => fn),
      inOut: jest.fn((fn) => fn),
    },
    // Entrance/exit builders are chainable (e.g. `FadeInDown.duration(220).delay(50)`).
    FadeIn: chainableAnimation(),
    FadeOut: chainableAnimation(),
    FadeInDown: chainableAnimation(),
    FadeInUp: chainableAnimation(),
    FadeInLeft: chainableAnimation(),
    FadeInRight: chainableAnimation(),
    SlideInDown: chainableAnimation(),
    SlideInUp: chainableAnimation(),
    SlideInLeft: chainableAnimation(),
    SlideInRight: chainableAnimation(),
    Layout: {},
    Keyframe: jest.fn(),
  };
});

// No native safe-area provider under jest; the library's own mock returns zero
// insets and a passthrough provider so screens using insets render.
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default
);

jest.mock("react-native-keyboard-controller", () => {
  const { ScrollView, View } = require("react-native");

  return {
    KeyboardAvoidingView: View,
    KeyboardAwareScrollView: ScrollView,
    KeyboardProvider: View,
    KeyboardToolbar: () => null,
  };
});

// No native connectivity under jest; default to online. Files needing other
// states (use-online-status, api/provider) mock this module themselves.
jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  useNetworkState: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
  })),
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
}));

// Mock expo-localization
jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [
    {
      languageTag: "en-US",
      languageCode: "en",
      textDirection: "ltr",
      digitGroupingSeparator: ",",
      decimalSeparator: ".",
      measurementSystem: "metric",
      currencyCode: "USD",
      currencySymbol: "$",
      regionCode: "US",
    },
  ]),
}));

// Mock react-native-mmkv
jest.mock("react-native-mmkv", () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
  useMMKVString: jest.fn((_key: string) => [undefined, jest.fn()]),
  useMMKVNumber: jest.fn((_key: string) => [undefined, jest.fn()]),
  useMMKVBoolean: jest.fn((_key: string) => [undefined, jest.fn()]),
  useMMKVObject: jest.fn((_key: string) => [undefined, jest.fn()]),
  createMMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

// Mock expo-haptics (no native haptic engine under jest)
jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

// The haptics seam is a synchronous no-op in tests: its real fire-and-forget
// promises would otherwise leak past test teardown. `haptics.test.ts` opts back
// into the real module via `jest.requireActual`.
jest.mock("@/lib/haptics", () => ({
  selection: jest.fn(),
  impact: jest.fn(),
  notify: jest.fn(),
  isEnabled: jest.fn(() => true),
  setEnabled: jest.fn(),
  HAPTICS_ENABLED_KEY: "HAPTICS_ENABLED",
}));

// Global window object setup for React Native testing
// @ts-expect-error
global.window = {};

// @ts-expect-error
global.window = global;

// Resolve Expo's lazy `fetch` getter now, so its one-time setup warning can't
// fire after a test ends and trip jest's "Cannot log after tests are done".
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: globalThis.fetch,
  writable: true,
});
