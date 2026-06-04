/**
 * Avatar source resolution.
 *
 * The backend already merges a resolved `avatarUrl` (uploaded blob first, then
 * the Better Auth `image`), but the client keeps its own precedence so the UI
 * can fall back to a bundled placeholder when neither source is present and so
 * the rule is testable without a Convex round-trip.
 */

/** Local placeholder shown when the user has no avatar of any kind. */
export const DEFAULT_AVATAR = require("@/assets/images/icon.png");

interface AvatarFields {
  /** Server-resolved URL: uploaded avatar, else OAuth `image`, else null. */
  avatarUrl?: string | null;
  /** Better Auth provider image (OAuth), if any. */
  image?: string | null;
}

/**
 * Pick the avatar source for an expo-image `source` prop.
 * Precedence: server-resolved `avatarUrl` → OAuth `image` → bundled placeholder.
 */
export function resolveAvatarSource(
  user: AvatarFields | null | undefined
): { uri: string } | number {
  const uri = user?.avatarUrl ?? user?.image ?? null;
  return uri ? { uri } : DEFAULT_AVATAR;
}
