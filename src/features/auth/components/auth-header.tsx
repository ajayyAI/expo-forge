import { Image } from "react-native";

import { Text, View } from "@/components/ui";
import type { TxKeyPath } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

const LOGO = require("@/assets/images/icon.png");

interface Props {
  title: TxKeyPath;
  subtitle?: TxKeyPath;
  /** Preserves the per-screen title testID some auth tests assert on. */
  titleTestID?: string;
}

// Shared brand header for the auth screens (sign-in / sign-up / forgot): the app
// mark above a large title and a muted subtitle, so every entry point reads as
// the same product.
export function AuthHeader({ title, subtitle, titleTestID }: Props) {
  return (
    <View className="mb-8 items-center">
      <Image
        accessibilityIgnoresInvertColors
        className="mb-5 h-16 w-16 rounded-2xl"
        source={LOGO}
      />
      <Text className="text-center font-bold text-3xl" testID={titleTestID}>
        {translate(title)}
      </Text>
      {subtitle ? (
        <Text className="mt-2 max-w-xs text-center text-base text-neutral-500 dark:text-neutral-400">
          {translate(subtitle)}
        </Text>
      ) : null}
    </View>
  );
}
