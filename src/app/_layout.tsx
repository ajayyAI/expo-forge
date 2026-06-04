import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import type { HeroUINativeConfig } from "heroui-native";
import { HeroUINativeProvider } from "heroui-native";
import type * as React from "react";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import FlashMessage from "react-native-flash-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  KeyboardProvider,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import { OfflineBanner } from "@/components/offline-banner";
import { useThemeConfig } from "@/components/ui/use-theme-config";
import { UpdateBanner } from "@/components/update-banner";
import { BiometricLockGate } from "@/features/auth/biometric-lock";
import { SoftDeleteRedirect } from "@/features/auth/soft-delete-redirect";
import { PurchasesProvider } from "@/features/purchases";

import { APIProvider } from "@/lib/api";
import { convexClient } from "@/lib/convex";
import { BetterAuthConvexProvider } from "@/lib/convex-auth";
import { installGlobalErrorHandler } from "@/lib/errors";
import { useNotificationObserver } from "@/lib/hooks/use-notification-observer";
import { usePushRegistration } from "@/lib/hooks/use-push-registration";
import { loadSelectedTheme } from "@/lib/hooks/use-selected-theme";
import { translate } from "@/lib/i18n";
import { initNotifications } from "@/lib/notifications";
import { initSentry, wrapWithSentry } from "@/lib/sentry";
import "../global.css";

// Custom route error boundary: app-styled fallback that reports the caught
// error to Sentry once per distinct error.
export { ErrorBoundary } from "@/components/ui";

// No-op unless EXPO_PUBLIC_SENTRY_DSN is set. Runs at module load, before the
// app mounts, so early errors are captured.
initSentry();

// Catches uncaught errors and unhandled rejections; no-op when Sentry owns them.
installGlobalErrorHandler();

// Register the Android notification channel (no-op off Android). Fire-and-forget
// at module load; the foreground handler is set when notifications.ts loads.
initNotifications().catch((err) => {
  if (__DEV__) {
    console.warn("[notifications] initNotifications failed:", err);
  }
});

export const unstable_settings = {
  initialRouteName: "(app)",
};

const authScreenOptions = {
  headerShown: true,
  headerTitle: "",
  headerLargeTitle: false,
  headerBackButtonDisplayMode: "minimal",
} as const;

loadSelectedTheme();
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

function RootLayout() {
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <Providers>
      <BiometricLockGate>
        <NotificationObserver />
        <SoftDeleteRedirect>
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              // Large titles collapse on scroll; pushed screens set
              // `contentInsetAdjustmentBehavior="automatic"` to match.
              headerLargeTitle: true,
              headerBackButtonDisplayMode: "minimal",
            }}
          >
            <Stack.Screen
              name="(app)"
              options={{ headerShown: false, title: translate("home.tab") }}
            />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={authScreenOptions} />
            <Stack.Screen name="sign-up" options={authScreenOptions} />
            <Stack.Screen name="forgot-password" options={authScreenOptions} />
            <Stack.Screen name="reset-password" options={authScreenOptions} />
            <Stack.Screen
              name="restore-account"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="profile" />
            <Stack.Screen
              name="sessions"
              options={{
                presentation: "formSheet",
                sheetAllowedDetents: [0.5, 1],
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen
              name="paywall"
              options={{
                presentation: "formSheet",
                sheetAllowedDetents: [0.5, 1],
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                headerLargeTitle: false,
              }}
            />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="terms" />
          </Stack>
        </SoftDeleteRedirect>
      </BiometricLockGate>
    </Providers>
  );
}

// Pass-through wrapper unless a DSN is configured.
export default wrapWithSentry(RootLayout);

// HeroUI Native global config. Dynamic Type is on (font scaling enabled) but
// capped so layouts stay usable at the largest accessibility sizes. The dev
// styling-principles console message is silenced to keep logs clean.
const heroUIConfig: HeroUINativeConfig = {
  textProps: {
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.5,
  },
  devInfo: {
    stylingPrinciples: false,
  },
};

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      className={theme.dark ? "dark" : undefined}
      style={styles.container}
    >
      <KeyboardProvider>
        <BetterAuthConvexProvider client={convexClient}>
          <PushRegistration />
          <ThemeProvider value={theme}>
            <HeroUINativeProvider config={heroUIConfig}>
              <APIProvider>
                <PurchasesProvider>
                  <BottomSheetModalProvider>
                    {children}
                    {/* Persistent top strips; sit under the transient flash. */}
                    <OfflineBanner />
                    <UpdateBanner />
                    <FlashMessage position="top" />
                    <KeyboardToolbar />
                  </BottomSheetModalProvider>
                </PurchasesProvider>
              </APIProvider>
            </HeroUINativeProvider>
          </ThemeProvider>
        </BetterAuthConvexProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

// Mounts push-token registration inside the Convex/auth provider tree so the
// hook has `useConvexAuth`/`useMutation` context. No-ops on web, non-device,
// and when unauthenticated.
function PushRegistration() {
  usePushRegistration();
  return null;
}

// Mounts notification tap-to-route inside the navigation tree so `router.push`
// is available. Runs regardless of auth state and no-ops on web.
function NotificationObserver() {
  useNotificationObserver();
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
