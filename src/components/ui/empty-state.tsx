import type * as React from "react";
import { View } from "react-native";

import type { TxKeyPath } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

import { AnimatedListItem } from "./animated-list-item";
import { Button } from "./button";
import { Text } from "./text";

interface Props {
  title: TxKeyPath;
  subtitle?: TxKeyPath;
  icon?: React.ReactNode;
  actionLabel?: TxKeyPath;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  title,
  subtitle,
  icon,
  actionLabel,
  onAction,
  testID,
}: Props) {
  return (
    <AnimatedListItem
      className="flex-1 items-center justify-center px-8 py-12"
      testID={testID}
    >
      {icon ? <View className="mb-4">{icon}</View> : null}
      <Text className="text-center font-semibold text-lg" tx={title} />
      {subtitle ? (
        <Text
          className="mt-1 text-center text-neutral-500 dark:text-neutral-400"
          tx={subtitle}
        />
      ) : null}
      {actionLabel && onAction ? (
        <Button
          className="mt-6"
          fullWidth={false}
          label={translate(actionLabel)}
          onPress={onAction}
          testID={testID ? `${testID}-action` : undefined}
          variant="outline"
        />
      ) : null}
    </AnimatedListItem>
  );
}
