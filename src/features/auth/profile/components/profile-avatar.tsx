import { Alert } from "react-native";
import {
  ActivityIndicator,
  Image,
  PressableScale,
  Text,
  View,
} from "@/components/ui";
import colors from "@/components/ui/colors";
import { translate } from "@/lib/i18n";

import { resolveAvatarSource } from "../avatar";

interface AvatarUser {
  avatarUrl?: string | null;
  image?: string | null;
  hasUploadedAvatar?: boolean;
}

interface ProfileAvatarProps {
  user: AvatarUser;
  pending: boolean;
  onChoosePhoto: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: () => void;
}

/**
 * Tappable avatar. Opens an action sheet offering choose/take/remove; "remove"
 * only appears when the user has an uploaded avatar to clear.
 */
export function ProfileAvatar({
  user,
  pending,
  onChoosePhoto,
  onTakePhoto,
  onRemovePhoto,
}: ProfileAvatarProps) {
  const openOptions = () => {
    const options: {
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }[] = [
      {
        text: translate("profile.avatar.choose_photo"),
        onPress: onChoosePhoto,
      },
      { text: translate("profile.avatar.take_photo"), onPress: onTakePhoto },
    ];
    if (user.hasUploadedAvatar) {
      options.push({
        text: translate("profile.avatar.remove_photo"),
        onPress: onRemovePhoto,
        style: "destructive",
      });
    }
    options.push({ text: translate("profile.avatar.cancel"), style: "cancel" });
    Alert.alert(translate("profile.avatar.title"), undefined, options);
  };

  return (
    <View className="items-center py-4">
      <PressableScale
        accessibilityLabel={translate("profile.avatar.title")}
        accessibilityRole="button"
        className="relative"
        disabled={pending}
        onPress={openOptions}
        testID="avatar-picker"
      >
        <Image
          className="h-28 w-28 rounded-full bg-neutral-200 dark:bg-neutral-800"
          contentFit="cover"
          source={resolveAvatarSource(user)}
        />
        {pending ? (
          <View className="absolute inset-0 items-center justify-center rounded-full bg-black/40">
            <ActivityIndicator color={colors.white} testID="avatar-pending" />
          </View>
        ) : null}
      </PressableScale>
      <Text className="mt-2 text-neutral-500 text-sm">
        {translate("profile.avatar.edit_hint")}
      </Text>
    </View>
  );
}
