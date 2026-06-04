import type * as React from "react";
import { Text, View } from "@/components/ui";
import { SURFACE_CARD_CLASS } from "@/components/ui/native";
import type { TxKeyPath } from "@/lib/i18n";

interface Props {
  children: React.ReactNode;
  title?: TxKeyPath;
}

export function SettingsContainer({ children, title }: Props) {
  return (
    <>
      {title && <Text className="pt-4 pb-2 text-lg" tx={title} />}
      <View className={SURFACE_CARD_CLASS}>{children}</View>
    </>
  );
}
