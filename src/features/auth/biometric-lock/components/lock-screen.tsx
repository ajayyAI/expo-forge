import Env from "env";

import { Button, Text, View } from "@/components/ui";
import { translate } from "@/lib/i18n";

interface LockScreenProps {
  onUnlock: () => void;
  pending: boolean;
  error: string | undefined;
}

/**
 * Full-screen app-lock overlay. Opaque background so it fully covers the app
 * content beneath it (the gate keeps the tree mounted to preserve navigation
 * state). Auto-prompting is driven by the hook; this offers a manual Unlock
 * fallback for when the user cancels the system prompt.
 */
export function LockScreen({ onUnlock, pending, error }: LockScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-black">
      <Text className="mb-2 text-center font-bold text-2xl">
        {Env.EXPO_PUBLIC_NAME}
      </Text>
      <Text className="mb-8 text-center text-neutral-600 dark:text-neutral-400">
        {translate("biometric_lock.subtitle")}
      </Text>
      <Button
        label={translate("biometric_lock.unlock")}
        loading={pending}
        onPress={onUnlock}
        testID="biometric-lock-unlock"
      />
      {error ? (
        <Text
          className="mt-2 text-center text-danger-600"
          testID="biometric-lock-error"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
