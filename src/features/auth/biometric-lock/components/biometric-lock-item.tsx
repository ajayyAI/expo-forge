import { useCallback, useRef, useState } from "react";

import { Switch, Text, View } from "@/components/ui";
import { translate } from "@/lib/i18n";

import { confirmWithBiometrics } from "../../biometric";
import { BIOMETRIC_LOCK_ENABLED } from "../config";
import { useBiometricLockEnabled } from "../preference";

/**
 * Settings row that arms / disarms the app-lock preference. Renders nothing
 * when the feature isn't compiled in, so the whole module excises cleanly.
 *
 * Turning ON first requires a successful biometric confirmation — proof the
 * user can actually authenticate — so the lock can't be armed into a state the
 * user can't satisfy. Turning OFF just clears the preference (already in an
 * unlocked session). `busyRef` blocks a re-entrant toggle while the prompt is
 * up.
 */
export function BiometricLockItem() {
  const [enabled, setEnabled] = useBiometricLockEnabled();
  const [pending, setPending] = useState(false);
  const busyRef = useRef(false);

  const onToggle = useCallback(
    async (next: boolean) => {
      if (busyRef.current) {
        return;
      }
      if (!next) {
        setEnabled(false);
        return;
      }
      busyRef.current = true;
      setPending(true);
      try {
        const confirmed = await confirmWithBiometrics(
          translate("biometric_lock.enable_prompt")
        );
        if (confirmed) {
          setEnabled(true);
        }
      } catch {
        // Couldn't confirm — leave the lock disarmed.
      } finally {
        busyRef.current = false;
        setPending(false);
      }
    },
    [setEnabled]
  );

  if (!BIOMETRIC_LOCK_ENABLED) {
    return null;
  }

  return (
    <View className="flex-1 flex-row items-center justify-between px-4 py-2">
      <Text tx="biometric_lock.settings_label" />
      <Switch
        accessibilityLabel={translate("biometric_lock.settings_label")}
        disabled={pending}
        onValueChange={(next) => {
          onToggle(next).catch(() => {
            // onToggle swallows its own failures; nothing to surface here.
          });
        }}
        value={enabled}
      />
    </View>
  );
}
