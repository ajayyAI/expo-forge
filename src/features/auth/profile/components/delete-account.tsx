import { Button, Text, View } from "@/components/ui";
import { translate } from "@/lib/i18n";

import { useDeleteAccount } from "../use-delete-account";

/**
 * Destructive account-deletion row for the bottom of the profile screen.
 * Opens a confirmation + biometric flow; surfaces failures inline and disables
 * itself while the deletion is in flight.
 */
export function DeleteAccount() {
  const { confirmAndDelete, pending, error } = useDeleteAccount();

  return (
    <View className="mt-8 px-4 pb-8">
      <Button
        disabled={pending}
        label={translate("account.delete.action")}
        loading={pending}
        onPress={confirmAndDelete}
        testID="delete-account-button"
        variant="destructive"
      />
      {error ? (
        <Text
          className="mt-2 text-center text-danger-600"
          testID="delete-account-error"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
