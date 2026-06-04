import { Alert } from "react-native";

import { Button, Text, View } from "@/components/ui";
import { translate } from "@/lib/i18n";

import { deviceLabel } from "../device-label";
import { relativeTime } from "../relative-time";
import type { SessionRow as SessionData } from "../use-sessions";

interface SessionRowProps {
  session: SessionData;
  isCurrent: boolean;
  revoking: boolean;
  /** True while any row is being revoked, to avoid concurrent revokes. */
  disabled: boolean;
  onRevoke: (token: string) => void;
}

export function SessionRow({
  session,
  isCurrent,
  revoking,
  disabled,
  onRevoke,
}: SessionRowProps) {
  const confirmRevoke = () => {
    Alert.alert(
      translate("sessions.revoke.title"),
      translate("sessions.revoke.message"),
      [
        { text: translate("sessions.revoke.cancel"), style: "cancel" },
        {
          text: translate("sessions.revoke.confirm"),
          style: "destructive",
          onPress: () => onRevoke(session.token),
        },
      ]
    );
  };

  return (
    <View
      className="flex-row items-center justify-between border-neutral-200 border-b px-4 py-3 dark:border-neutral-700"
      testID={`session-row-${session.id}`}
    >
      <View className="flex-1 pr-3">
        <View className="flex-row items-center">
          <Text className="font-semibold text-base">
            {deviceLabel(session.userAgent)}
          </Text>
          {isCurrent ? (
            <View className="ml-2 rounded-full bg-primary-600 px-2 py-0.5">
              <Text className="text-white text-xs">
                {translate("sessions.this_device")}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-neutral-500 text-sm">
          {relativeTime(session.createdAt)}
        </Text>
        {session.ipAddress ? (
          <Text className="text-neutral-500 text-sm">{session.ipAddress}</Text>
        ) : null}
      </View>
      {isCurrent ? null : (
        <Button
          accessibilityLabel={`${deviceLabel(session.userAgent)} — ${translate("sessions.revoke.action")}`}
          disabled={disabled}
          label={translate("sessions.revoke.action")}
          loading={revoking}
          onPress={confirmRevoke}
          size="sm"
          testID={`session-revoke-${session.id}`}
          variant="destructive"
        />
      )}
    </View>
  );
}
