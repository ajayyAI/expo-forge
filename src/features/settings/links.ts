/**
 * Optional external-link rows in Settings.
 *
 * Support / GitHub / Website are opt-in: each surfaces only when its public env
 * var is set, mirroring the auth provider capability pattern. A row with no
 * target would be a dead end, so absent vars hide the row entirely.
 *
 * Values come from the root env contract so Settings does not need to know
 * where public build-time config is read.
 */

import Env, { readOptionalPublicString } from "env";

export type SettingsLink = "support" | "github" | "website";

export function getSupportEmail(): string | undefined {
  return readOptionalPublicString(Env.EXPO_PUBLIC_SUPPORT_EMAIL);
}

export function getGithubUrl(): string | undefined {
  return readOptionalPublicString(Env.EXPO_PUBLIC_GITHUB_URL);
}

export function getWebsiteUrl(): string | undefined {
  return readOptionalPublicString(Env.EXPO_PUBLIC_WEBSITE_URL);
}

/** The external-link rows that have a configured target, in display order. */
export function getVisibleSettingsLinks(): SettingsLink[] {
  const links: SettingsLink[] = [];
  if (getGithubUrl()) {
    links.push("github");
  }
  if (getWebsiteUrl()) {
    links.push("website");
  }
  return links;
}

/** Whether the Support (mailto) row should be shown. */
export function isSupportVisible(): boolean {
  return getSupportEmail() !== undefined;
}
