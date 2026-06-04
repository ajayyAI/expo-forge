import type { api } from "convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";

import { Button, Text, View } from "@/components/ui";
import { translate } from "@/lib/i18n";

import { getAvailableAuthMethods } from "../capabilities";
import { signInWithApple, signInWithGoogle } from "../social-sign-in";

interface SocialSignInButtonsProps {
  /** Enabled providers from the server; `undefined` while the query loads. */
  enabled: FunctionReturnType<typeof api.auth.getEnabledProviders> | undefined;
  /** Surfaces a provider failure on the parent screen. */
  onError: (message: string) => void;
}

/**
 * Apple / Google buttons. A provider renders only when BOTH the platform
 * supports it (`capabilities`) AND the deployment has it configured
 * (`getEnabledProviders`), so a button never shows for a flow that would fail
 * at submit. While the server check is loading, no social buttons render.
 */
export function SocialSignInButtons({
  enabled,
  onError,
}: SocialSignInButtonsProps) {
  const methods = getAvailableAuthMethods();
  const [pending, setPending] = useState<"google" | "apple" | null>(null);

  if (!enabled) return null;

  const showGoogle = enabled.google && methods.includes("google");
  const showApple = enabled.apple && methods.includes("apple");

  if (!(showGoogle || showApple)) return null;

  const run = async (
    provider: "google" | "apple",
    fn: () => Promise<string | undefined>
  ) => {
    setPending(provider);
    const message = await fn();
    setPending(null);
    if (message) onError(message);
  };

  return (
    <View className="mt-6 gap-3">
      {showApple ? (
        <Button
          disabled={pending !== null}
          label={translate("auth.continue_apple")}
          loading={pending === "apple"}
          onPress={() => run("apple", signInWithApple)}
          testID="apple-sign-in-button"
          variant="outline"
        />
      ) : null}

      {showGoogle ? (
        <Button
          disabled={pending !== null}
          label={translate("auth.continue_google")}
          loading={pending === "google"}
          onPress={() => run("google", signInWithGoogle)}
          testID="google-sign-in-button"
          variant="outline"
        />
      ) : null}

      <View className="my-2 flex-row items-center">
        <View className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
        <Text className="mx-3 text-neutral-500 text-sm">
          {translate("auth.or")}
        </Text>
        <View className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
      </View>
    </View>
  );
}
