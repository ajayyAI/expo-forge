import type { ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { TxKeyPath } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import { captureException } from "@/lib/sentry";
import { Button } from "./button";
import { Text } from "./text";

interface Props {
  /** Re-runs the failed render. Wired to expo-router's `retry` at the route. */
  onRetry: () => void;
  /** The caught error; its message is shown only in `__DEV__`. */
  error?: Error;
  testID?: string;
}

/**
 * `translate` returns the key verbatim when i18next hasn't finished init, which
 * can happen on a cold-start crash during the very first render. Coalesce to a
 * hardcoded English literal so the last-resort screen never shows a raw key.
 */
function resolveText(key: TxKeyPath, fallback: string) {
  const value = translate(key);
  return value === key ? fallback : value;
}

/**
 * Full-screen themed fallback for the route error boundary. Technical detail is
 * surfaced only in development so stack traces never reach users in production.
 */
export function ErrorFallback({ onRetry, error, testID }: Props) {
  const title = resolveText("error_boundary.title", "Something went wrong");
  const message = resolveText(
    "error_boundary.message",
    "An unexpected error occurred. You can try again, and if the problem continues, restart the app."
  );

  return (
    <SafeAreaView
      accessibilityRole="alert"
      className="flex-1 bg-background"
      testID={testID}
    >
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center font-bold text-foreground text-xl">
          {title}
        </Text>
        <Text className="mt-3 text-center text-neutral-500 dark:text-neutral-400">
          {message}
        </Text>
        {__DEV__ && error?.message ? (
          <Text
            className="mt-4 text-center text-red-600 text-sm"
            testID={testID ? `${testID}-detail` : undefined}
          >
            {error.message}
          </Text>
        ) : null}
        <Button
          accessibilityHint="Re-runs the screen that failed to load"
          className="mt-8"
          fullWidth={false}
          label={resolveText("error_boundary.retry", "Try again")}
          onPress={onRetry}
          testID={testID ? `${testID}-retry` : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

/**
 * Route error boundary for expo-router. Reports the caught error to Sentry once
 * per distinct error (the effect is keyed on `error`, so re-renders with the
 * same error don't re-report) and renders the themed fallback.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <ErrorFallback error={error} onRetry={retry} testID="error-boundary" />
  );
}
