import { api } from "convex/_generated/api";
import { Redirect, Stack } from "expo-router";

import {
  ActivityIndicator,
  FocusAwareStatusBar,
  ScreenContainer,
  ScrollView,
  Text,
  View,
} from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@/lib/convex";
import { translate } from "@/lib/i18n";

import { DeleteAccount } from "./components/delete-account";
import { ProfileAvatar } from "./components/profile-avatar";
import { ProfileForm, type ProfileValues } from "./components/profile-form";
import { useAvatarUpload } from "./use-avatar-upload";

export function ProfileScreen() {
  const user = useQuery(api.users.getMe);
  const updateProfile = useMutation(api.users.updateProfile);
  const avatar = useAvatarUpload();

  if (user === undefined) {
    return (
      <View
        className="flex-1 items-center justify-center"
        testID="profile-loading"
      >
        <ActivityIndicator />
      </View>
    );
  }

  // Logged-out (or session cleared): nothing to edit, send to sign-in.
  if (user === null) {
    return <Redirect href="/login" />;
  }

  const onSubmit = async (
    values: ProfileValues
  ): Promise<string | undefined> => {
    // Name lives on the Better Auth user; bio lives on the app users row.
    if (values.name !== user.name) {
      const { error } = await authClient.updateUser({ name: values.name });
      if (error) {
        return error.message ?? translate("profile.errors.save_failed");
      }
    }
    if (values.bio !== (user.bio ?? "")) {
      try {
        await updateProfile({ bio: values.bio });
      } catch {
        return translate("profile.errors.save_failed");
      }
    }
    return undefined;
  };

  return (
    <>
      <Stack.Screen options={{ title: translate("profile.title") }} />
      <FocusAwareStatusBar />
      <ScrollView
        contentContainerClassName="flex-grow"
        contentInsetAdjustmentBehavior="automatic"
      >
        <ScreenContainer>
          <ProfileAvatar
            onChoosePhoto={() => avatar.upload("library")}
            onRemovePhoto={avatar.remove}
            onTakePhoto={() => avatar.upload("camera")}
            pending={avatar.pending}
            user={user}
          />
          {avatar.error ? (
            <Text
              className="px-4 text-center text-danger-600"
              testID="avatar-error"
            >
              {avatar.error}
            </Text>
          ) : null}
          <ProfileForm
            email={user.email}
            initialValues={{ name: user.name, bio: user.bio ?? "" }}
            onSubmit={onSubmit}
          />
          <DeleteAccount />
        </ScreenContainer>
      </ScrollView>
    </>
  );
}
