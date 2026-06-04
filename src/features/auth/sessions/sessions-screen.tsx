import { Redirect, Stack } from "expo-router";

import {
  AnimatedListItem,
  Button,
  EmptyState,
  FocusAwareStatusBar,
  List,
  SkeletonList,
  Text,
  View,
} from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { translate } from "@/lib/i18n";

import { SessionRow } from "./components/session-row";
import type { SessionRow as SessionData } from "./use-sessions";
import { useSessions } from "./use-sessions";

export function SessionsScreen() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 bg-background" testID="sessions-loading">
        <SkeletonList testID="sessions-skeleton" />
      </View>
    );
  }

  if (!session?.session) {
    return <Redirect href="/login" />;
  }

  return <AuthenticatedSessionsScreen currentToken={session.session.token} />;
}

function AuthenticatedSessionsScreen({
  currentToken,
}: {
  currentToken: string;
}) {
  const { sessions, loading, error, revokingToken, refresh, revoke } =
    useSessions();

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: translate("sessions.title") }} />
        <FocusAwareStatusBar />
        <View className="flex-1 bg-background px-4 py-3">
          <Text className="text-center text-danger-600" testID="sessions-error">
            {error}
          </Text>
          <Button
            label={translate("sessions.retry")}
            onPress={refresh}
            variant="outline"
          />
        </View>
      </>
    );
  }

  if (loading && sessions.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: translate("sessions.title") }} />
        <FocusAwareStatusBar />
        <View className="flex-1 bg-background">
          <SkeletonList testID="sessions-skeleton" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: translate("sessions.title") }} />
      <FocusAwareStatusBar />
      <List
        contentContainerClassName="flex-grow"
        contentInsetAdjustmentBehavior="automatic"
        data={sessions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState testID="sessions-empty" title="sessions.empty" />
        }
        onRefresh={refresh}
        refreshing={loading && sessions.length > 0}
        renderItem={({ item, index }: { item: SessionData; index: number }) => (
          <AnimatedListItem index={index}>
            <SessionRow
              disabled={revokingToken !== undefined}
              isCurrent={item.token === currentToken}
              onRevoke={revoke}
              revoking={revokingToken === item.token}
              session={item}
            />
          </AnimatedListItem>
        )}
      />
    </>
  );
}
