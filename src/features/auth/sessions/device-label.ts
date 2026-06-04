import { translate } from "@/lib/i18n";

/**
 * Map a session's `userAgent` to a human device label. Matching is ordered most-
 * specific first (iPhone/iPad before the generic Apple/Mac fallbacks) so the
 * narrowest match wins. Returns a translated "Unknown device" when the string is
 * missing or unrecognised. Kept pure so it can be unit-tested without a session.
 */
export function deviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return translate("sessions.device.unknown");
  }

  const ua = userAgent.toLowerCase();

  if (ua.includes("iphone")) {
    return translate("sessions.device.iphone");
  }
  if (ua.includes("ipad")) {
    return translate("sessions.device.ipad");
  }
  if (ua.includes("android")) {
    return translate("sessions.device.android");
  }
  // "Mac" must come after iPhone/iPad: iOS UAs also contain "Mac OS X".
  if (ua.includes("macintosh") || ua.includes("mac os")) {
    return translate("sessions.device.mac");
  }
  if (ua.includes("windows")) {
    return translate("sessions.device.windows");
  }
  if (ua.includes("linux")) {
    return translate("sessions.device.linux");
  }

  return translate("sessions.device.unknown");
}
