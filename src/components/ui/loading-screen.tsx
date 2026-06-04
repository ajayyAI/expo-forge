import { ActivityIndicator, View } from "react-native";
import type { TxKeyPath } from "@/lib/i18n";
import { Text } from "./text";

interface Props {
  /** i18n key for an optional message rendered under the spinner. */
  tx?: TxKeyPath;
  message?: string;
  testID?: string;
}

/** Centered full-screen loader. Shared seam for any "session loading" view. */
export function LoadingScreen({ tx, message, testID }: Props) {
  return (
    <View
      className="flex-1 items-center justify-center bg-background"
      testID={testID}
    >
      <ActivityIndicator />
      {(tx || message) && (
        <Text className="mt-4 text-neutral-500 dark:text-neutral-400" tx={tx}>
          {message}
        </Text>
      )}
    </View>
  );
}
