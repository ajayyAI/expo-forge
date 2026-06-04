import type { ConfigContext, ExpoConfig } from "@expo/config";

import type { AppIconBadgeConfig } from "app-icon-badge/types";

import "tsx/cjs";

// tsx/cjs must be imported before env.ts so the env loader can run
import Env from "./env";

const EXPO_ACCOUNT_OWNER = process.env.EXPO_ACCOUNT_OWNER ?? "";
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? "";

// Google Sign In config plugin. Only pushed when an iOS client id is present,
// so `expo prebuild` stays green without real Google credentials. Google's
// native iOS SDK requires the reversed client id as a URL scheme: the client
// id `<id>.apps.googleusercontent.com` maps to `com.googleusercontent.apps.<id>`.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

function googleIosUrlScheme(clientId: string): string {
  const suffix = ".apps.googleusercontent.com";
  const id = clientId.endsWith(suffix)
    ? clientId.slice(0, -suffix.length)
    : clientId;
  return `com.googleusercontent.apps.${id}`;
}

const googleSignInPlugin: ExpoConfig["plugins"] = GOOGLE_IOS_CLIENT_ID
  ? [
      [
        "@react-native-google-signin/google-signin",
        { iosUrlScheme: googleIosUrlScheme(GOOGLE_IOS_CLIENT_ID) },
      ],
    ]
  : [];

// Apple Sign In is iOS-only and adds the "Sign in with Apple" capability/
// entitlement. Gated on the same public flag the client uses to surface the
// button, so prebuild only requests the entitlement when the feature is on.
const APPLE_AUTH_FLAG = process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED;
const appleAuthEnabled = APPLE_AUTH_FLAG === "true" || APPLE_AUTH_FLAG === "1";

const appleSignInPlugin: ExpoConfig["plugins"] = appleAuthEnabled
  ? ["expo-apple-authentication"]
  : [];

// Sentry config plugin (source-map upload + native init). Only pushed when org
// + project are present, so prebuild/expo-doctor/web export stay green without
// a Sentry account. SENTRY_AUTH_TOKEN is a build-only secret read from the
// environment by the plugin during EAS builds; never commit it.
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;

const sentryPlugin: ExpoConfig["plugins"] =
  SENTRY_ORG && SENTRY_PROJECT
    ? [
        [
          "@sentry/react-native/expo",
          { organization: SENTRY_ORG, project: SENTRY_PROJECT },
        ],
      ]
    : [];

// Universal Links. Only emitted when `EXPO_PUBLIC_ASSOCIATED_DOMAIN` is set, so
// prebuild/expo-doctor/web export stay green without a domain. The iOS
// `applinks:` value and the Android verified-intent host are bare hostnames,
// not full URLs, so we extract the host from the configured https URL.
const ASSOCIATED_DOMAIN = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN;

function associatedDomainHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.port === ""
      ? parsed.hostname
      : null;
  } catch {
    return null;
  }
}

const universalLinkHost = ASSOCIATED_DOMAIN
  ? associatedDomainHost(ASSOCIATED_DOMAIN)
  : null;

const iosAssociatedDomains: Pick<
  NonNullable<ExpoConfig["ios"]>,
  "associatedDomains"
> = universalLinkHost
  ? { associatedDomains: [`applinks:${universalLinkHost}`] }
  : {};

// Android verified App Links: `autoVerify` makes the system check
// assetlinks.json on this host and open the app without a chooser. You host
// that assetlinks.json (with your signing-cert fingerprint) yourself.
const androidIntentFilters: Pick<
  NonNullable<ExpoConfig["android"]>,
  "intentFilters"
> = universalLinkHost
  ? {
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [{ scheme: "https", host: universalLinkHost }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    }
  : {};

const appIconBadgeConfig: AppIconBadgeConfig = {
  enabled: Env.EXPO_PUBLIC_APP_ENV !== "production",
  badges: [
    {
      text: Env.EXPO_PUBLIC_APP_ENV,
      type: "banner",
      color: "white",
    },
    {
      text: Env.EXPO_PUBLIC_VERSION.toString(),
      type: "ribbon",
      color: "white",
    },
  ],
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.EXPO_PUBLIC_NAME,
  description: `${Env.EXPO_PUBLIC_NAME} Mobile App`,
  ...(EXPO_ACCOUNT_OWNER ? { owner: EXPO_ACCOUNT_OWNER } : {}),
  scheme: Env.EXPO_PUBLIC_SCHEME,
  slug: "expo-forge",
  version: Env.EXPO_PUBLIC_VERSION.toString(),
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  // OTA updates. `runtimeVersion` ties a JS bundle to a compatible native build;
  // the `appVersion` policy derives it from `version`, so a runtime bump only
  // happens on a real release. The update URL/project id is wired per-consumer
  // at EAS setup — until then `expo-updates` reports `isEnabled: false`, so the
  // check/banner stay inert and never throw.
  runtimeVersion: { policy: "appVersion" },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.EXPO_PUBLIC_BUNDLE_ID,
    usesAppleSignIn: appleAuthEnabled,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    ...iosAssociatedDomains,
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#FFFFFF",
    },
    package: Env.EXPO_PUBLIC_PACKAGE,
    predictiveBackGestureEnabled: false,
    ...androidIntentFilters,
  },
  web: {
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },
  plugins: [
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FFFFFF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 150,
      },
    ],
    [
      "expo-font",
      {
        ios: {
          fonts: [
            "node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf",
            "node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf",
            "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf",
            "node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf",
          ],
        },
        android: {
          fonts: [
            {
              fontFamily: "Inter",
              fontDefinitions: [
                {
                  path: "node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf",
                  weight: 400,
                },
                {
                  path: "node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf",
                  weight: 500,
                },
                {
                  path: "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf",
                  weight: 600,
                },
                {
                  path: "node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf",
                  weight: 700,
                },
              ],
            },
          ],
        },
      },
    ],
    "expo-localization",
    "expo-router",
    "expo-secure-store",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow $(PRODUCT_NAME) to access your photos so you can set a profile picture.",
        cameraPermission:
          "Allow $(PRODUCT_NAME) to use the camera so you can take a profile picture.",
      },
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission:
          "Allow $(PRODUCT_NAME) to use Face ID to confirm sensitive actions.",
      },
    ],
    ["app-icon-badge", appIconBadgeConfig],
    ["react-native-edge-to-edge"],
    ["expo-build-properties", { ios: { deploymentTarget: "16.4" } }],
    ["./plugins/with-pod-deployment-target", { target: "16.4" }],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#2E3C4B",
      },
    ],
    ...googleSignInPlugin,
    ...appleSignInPlugin,
    ...sentryPlugin,
  ],
  extra: {
    ...(EAS_PROJECT_ID
      ? {
          eas: {
            projectId: EAS_PROJECT_ID,
          },
        }
      : {}),
  },
});
