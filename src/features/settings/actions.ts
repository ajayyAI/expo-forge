/**
 * Settings action handlers: native share sheet, store review, and the optional
 * mailto / external-link rows. Kept as plain functions so they're unit-testable
 * without mounting the screen.
 */

import Env from "env";
import * as StoreReview from "expo-store-review";
import { Linking, Platform, Share } from "react-native";
import { showErrorMessage } from "@/components/ui/utils";
import { translate } from "@/lib/i18n";
import { getGithubUrl, getSupportEmail, getWebsiteUrl } from "./links";

/** Open the OS share sheet (or the Web Share API), referencing the app. */
export async function shareApp(): Promise<void> {
  const message = translate("settings.share_message", {
    name: Env.EXPO_PUBLIC_NAME,
  });

  // RN's Share is unavailable on web; fall back to the Web Share API when the
  // browser supports it, otherwise surface a non-fatal notice.
  if (Platform.OS === "web") {
    const webShare = (
      globalThis as {
        navigator?: { share?: (data: { text: string }) => Promise<void> };
      }
    ).navigator?.share;
    if (webShare) {
      try {
        await webShare({ text: message });
      } catch {
        // User dismissed the sheet — nothing to do.
      }
      return;
    }
    showErrorMessage(translate("settings.share_unavailable"));
    return;
  }

  try {
    await Share.share({ message });
  } catch {
    // Sharing failed or was dismissed; not worth interrupting the user.
  }
}

/** Prompt the native store-review flow when the platform supports it. */
export async function rateApp(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
    }
  } catch {
    // Review prompts are throttled by the OS and best-effort; ignore failures.
  }
}

async function openUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    showErrorMessage(translate("settings.link_error"));
  }
}

/** Open a mailto: to the configured support address. No-op if unset. */
export async function contactSupport(): Promise<void> {
  const email = getSupportEmail();
  if (!email) {
    return;
  }
  const subject = translate("settings.support_subject", {
    name: Env.EXPO_PUBLIC_NAME,
  });
  await openUrl(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
}

/** Open the configured GitHub URL. No-op if unset. */
export async function openGithub(): Promise<void> {
  const url = getGithubUrl();
  if (url) {
    await openUrl(url);
  }
}

/** Open the configured website URL. No-op if unset. */
export async function openWebsite(): Promise<void> {
  const url = getWebsiteUrl();
  if (url) {
    await openUrl(url);
  }
}
