import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useRef, useState } from "react";

import { useMutation } from "@/lib/convex";
import { translate } from "@/lib/i18n";

type PickerSource = "library" | "camera";

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

async function requestPermission(source: PickerSource): Promise<boolean> {
  const result =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return result.granted;
}

async function launch(
  source: PickerSource
): Promise<ImagePicker.ImagePickerAsset | null> {
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  if (result.canceled || !result.assets[0]) {
    return null;
  }
  return result.assets[0];
}

/**
 * Avatar upload/removal for the profile screen.
 *
 * Wraps the full round-trip: image-picker permission + launch → signed upload
 * URL → blob POST → commit the storage id. Errors surface as a translated
 * message rather than throwing so the screen can render them inline. `pending`
 * covers both upload and removal so the avatar UI can disable during either.
 */
export function useAvatarUpload() {
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const deleteAvatar = useMutation(api.users.deleteAvatar);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Guards against re-entry while the picker/permission prompt is open, before
  // `pending` (and thus the disabled state) has had a chance to engage.
  const busyRef = useRef(false);

  const upload = useCallback(
    async (source: PickerSource) => {
      if (busyRef.current) {
        return;
      }
      busyRef.current = true;
      setError(undefined);
      try {
        if (!(await requestPermission(source))) {
          setError(translate("profile.avatar.permission_denied"));
          return;
        }

        const asset = await launch(source);
        if (!asset) {
          return; // User cancelled — not an error.
        }

        setPending(true);
        const uploadUrl = await generateUploadUrl();
        const blob = await (await fetch(asset.uri)).blob();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
          body: blob,
        });
        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        await updateAvatar({ storageId });
      } catch {
        setError(translate("profile.avatar.upload_failed"));
      } finally {
        busyRef.current = false;
        setPending(false);
      }
    },
    [generateUploadUrl, updateAvatar]
  );

  const remove = useCallback(async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setError(undefined);
    setPending(true);
    try {
      await deleteAvatar();
    } catch {
      setError(translate("profile.avatar.remove_failed"));
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }, [deleteAvatar]);

  return { upload, remove, pending, error };
}
