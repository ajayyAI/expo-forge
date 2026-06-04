import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

import { AUTH_SITE_URL } from "./backend-config";

const rawScheme = Constants.expoConfig?.scheme;
const scheme = Array.isArray(rawScheme) ? rawScheme[0] : rawScheme;

export const authClient = createAuthClient({
  baseURL: AUTH_SITE_URL,
  plugins: [
    convexClient(),
    usernameClient(),
    emailOTPClient(),
    expoClient({
      scheme,
      storagePrefix: scheme ?? "better-auth",
      storage: SecureStore,
    }),
  ],
});
