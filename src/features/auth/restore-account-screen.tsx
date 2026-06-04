import { api } from "convex/_generated/api";
import { Redirect, Stack, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";

import {
  ActivityIndicator,
  Button,
  FocusAwareStatusBar,
  Text,
  View,
} from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@/lib/convex";
import { getLanguage, translate } from "@/lib/i18n";

import { permanentDeletionAt } from "./account-deletion";

/**
 * Landing screen for a signed-in user whose account is pending deletion.
 *
 * Lives OUTSIDE the `(app)` auth gate so the gate's `deletedAt` redirect can
 * route here without looping. Offers two exits: restore (lift the deletion and
 * return to the app) or sign out (let the deletion proceed). If the user is no
 * longer soft-deleted (restored elsewhere, or the query resolves to null),
 * it redirects home so the user is never stranded.
 */
export function RestoreAccountScreen() {
  const user = useQuery(api.users.getMe);
  const restoreAccount = useMutation(api.users.restoreAccount);
  const router = useRouter();

  const [error, setError] = useState<string | undefined>();
  const busyRef = useRef(false);
  const [pending, setPending] = useState<"restore" | "signOut" | undefined>();

  const onRestore = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setError(undefined);
    setPending("restore");
    try {
      await restoreAccount();
      router.replace("/");
    } catch {
      setError(translate("account.restore.error"));
      busyRef.current = false;
      setPending(undefined);
    }
  }, [restoreAccount, router]);

  const onSignOut = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setPending("signOut");
    try {
      await authClient.signOut();
      // Gate redirects to /login once the session clears; replace as a fallback
      // for the auth-not-required case where the gate would let them through.
      router.replace("/login");
    } catch {
      setError(translate("account.restore.error"));
      busyRef.current = false;
      setPending(undefined);
    }
  }, [router]);

  if (user === undefined) {
    return (
      <View
        className="flex-1 items-center justify-center"
        testID="restore-loading"
      >
        <ActivityIndicator />
      </View>
    );
  }

  // Not soft-deleted (already restored, or no session): nothing to do here.
  if (!user?.deletedAt) {
    return <Redirect href="/" />;
  }

  const deletionDate = formatDate(permanentDeletionAt(user.deletedAt));

  return (
    <>
      <Stack.Screen options={{ title: translate("account.restore.title") }} />
      <FocusAwareStatusBar />
      <View className="flex-1 justify-center px-6">
        <Text className="text-center font-bold text-2xl">
          {translate("account.restore.heading")}
        </Text>
        <Text className="mt-4 text-center text-neutral-600 dark:text-neutral-400">
          {translate("account.restore.body", { date: deletionDate })}
        </Text>

        {error ? (
          <Text
            className="mt-4 text-center text-danger-600"
            testID="restore-error"
          >
            {error}
          </Text>
        ) : null}

        <View className="mt-8">
          <Button
            disabled={pending !== undefined}
            label={translate("account.restore.restore_action")}
            loading={pending === "restore"}
            onPress={() => {
              onRestore().catch(() => {
                // onRestore surfaces failures via `error`.
              });
            }}
            testID="restore-button"
          />
          <Button
            disabled={pending !== undefined}
            label={translate("account.restore.sign_out_action")}
            loading={pending === "signOut"}
            onPress={() => {
              onSignOut().catch(() => {
                // onSignOut surfaces failures via `error`.
              });
            }}
            testID="restore-sign-out-button"
            variant="outline"
          />
        </View>
      </View>
    </>
  );
}

/** Localized long-form date for the permanent-deletion deadline. */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(getLanguage(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
