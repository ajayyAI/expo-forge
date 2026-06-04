import { api } from "convex/_generated/api";
import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";

import { buildAttestation, createAppAttestClient } from "@/lib/app-attest";
import { authClient } from "@/lib/auth-client";
import { convexClient, useAction } from "@/lib/convex";
import { impact, notify } from "@/lib/haptics";
import { translate } from "@/lib/i18n";

import { confirmWithBiometrics } from "../biometric";

/**
 * Account deletion for the profile screen.
 *
 * Flow: destructive `Alert` confirmation → biometric (Face ID / Touch ID)
 * confirmation when available → `deleteAccount` mutation → sign out. The
 * soft-delete gate then routes the (still signed-in) user to the restore
 * screen. Biometrics degrade open: when no hardware is enrolled the Alert
 * alone confirms; an attempted-and-failed prompt aborts the deletion.
 *
 * `pending` drives the button's disabled/loading state; `busyRef` blocks
 * re-entry in the window before `pending` engages so a double-tap can't fire
 * the flow twice.
 */
export function useDeleteAccount() {
  const deleteAccount = useAction(api.userActions.deleteAccount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const busyRef = useRef(false);

  const runDeletion = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setError(undefined);

    try {
      const confirmed = await confirmWithBiometrics(
        translate("account.delete.biometric_prompt")
      );
      if (!confirmed) {
        return; // Prompt shown and failed/cancelled — abort, not an error.
      }

      setPending(true);

      // Best-effort App Attest: bind this deletion to the device when we can.
      let attestation: Awaited<ReturnType<typeof buildAttestation>> = null;
      if (convexClient) {
        try {
          attestation = await buildAttestation(
            createAppAttestClient(convexClient),
            "deleteAccount"
          );
        } catch {
          // Couldn't attest (e.g. enrollment failed). Proceed unattested; the
          // server rejects if APP_ATTEST_ENFORCEMENT requires it, surfacing the
          // failure through the catch below.
        }
      }
      await deleteAccount(attestation ?? {});
      // Sign-out clears the session. The account is now soft-deleted
      // server-side; on the next authenticated load `getMe` reports `deletedAt`
      // and the gate routes to the restore screen. Even if this sign-out fails,
      // that gate check still catches the deletion on re-login — the user can't
      // get stuck in a half-deleted state.
      await authClient.signOut();
    } catch {
      notify("error");
      setError(translate("account.delete.error"));
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }, [deleteAccount]);

  const confirmAndDelete = useCallback(() => {
    Alert.alert(
      translate("account.delete.confirm_title"),
      translate("account.delete.confirm_message"),
      [
        { text: translate("account.delete.cancel"), style: "cancel" },
        {
          text: translate("account.delete.confirm"),
          style: "destructive",
          onPress: () => {
            impact("medium");
            runDeletion().catch(() => {
              // runDeletion already surfaces failures via `error`.
            });
          },
        },
      ]
    );
  }, [runDeletion]);

  return { confirmAndDelete, pending, error };
}
