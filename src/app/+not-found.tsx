import { Stack, useRouter } from "expo-router";

import { EmptyState, View } from "@/components/ui";
import { translate } from "@/lib/i18n";

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: translate("not_found.title") }} />
      <EmptyState
        actionLabel="not_found.action"
        onAction={() => router.replace("/")}
        subtitle="not_found.subtitle"
        testID="not-found"
        title="not_found.heading"
      />
    </View>
  );
}
