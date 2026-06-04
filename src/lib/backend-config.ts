import Env, { readOptionalPublicHttpUrl } from "env";

export const CONVEX_URL = readOptionalPublicHttpUrl(Env.EXPO_PUBLIC_CONVEX_URL);
export const AUTH_SITE_URL = readOptionalPublicHttpUrl(
  Env.EXPO_PUBLIC_CONVEX_SITE_URL
);

export const BACKEND_ENABLED = Boolean(CONVEX_URL && AUTH_SITE_URL);
