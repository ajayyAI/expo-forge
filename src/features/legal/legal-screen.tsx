import { Stack } from "expo-router";

import { FocusAwareStatusBar, ScrollView, Text, View } from "@/components/ui";
import type { TxKeyPath } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

interface Props {
  title: TxKeyPath;
  /** Body paragraphs, already translated. */
  body: string[];
  testID?: string;
}

// Shared, themed, scrollable shell for the placeholder legal pages. The visible
// placeholder banner is intentional: the app owner must swap in real policy
// copy before shipping.
export function LegalScreen({ title, body, testID }: Props) {
  const heading = translate(title);

  return (
    <>
      <Stack.Screen options={{ title: heading }} />
      <FocusAwareStatusBar />
      <ScrollView
        contentContainerClassName="flex-grow p-4"
        contentInsetAdjustmentBehavior="automatic"
        testID={testID}
      >
        <Text className="mb-4 font-bold text-xl">{heading}</Text>

        <View className="mb-4 rounded-xl border border-warning-300 bg-warning-50 p-3 dark:border-warning-700 dark:bg-warning-900/30">
          <Text className="text-sm text-warning-800 dark:text-warning-200">
            {translate("legal.placeholder_notice")}
          </Text>
        </View>

        {body.map((paragraph, i) => (
          <Text
            className="mb-3 text-neutral-700 dark:text-neutral-300"
            // biome-ignore lint/suspicious/noArrayIndexKey: static ordered paragraphs, never reordered
            key={i}
          >
            {paragraph}
          </Text>
        ))}
      </ScrollView>
    </>
  );
}
