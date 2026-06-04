import z from "zod";

import packageJSON from "./package.json";

const associatedDomainUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && url.port === "";
      } catch {
        return false;
      }
    },
    { message: "Must be an HTTPS URL without a port" }
  );

// Single unified environment schema. Exported so the validation contract can be
// unit-tested directly without triggering the module's strict-throw side effect.
export const envSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z.enum(["development", "preview", "production"]),
  EXPO_PUBLIC_NAME: z.string(),
  EXPO_PUBLIC_SCHEME: z.string(),
  EXPO_PUBLIC_BUNDLE_ID: z.string(),
  EXPO_PUBLIC_PACKAGE: z.string(),
  EXPO_PUBLIC_VERSION: z.string(),
  EXPO_PUBLIC_ASSOCIATED_DOMAIN: associatedDomainUrl.optional(),
  EXPO_PUBLIC_VAR_NUMBER: z.number(),
  EXPO_PUBLIC_VAR_BOOL: z.boolean(),

  // Convex + auth. URLs are required for auth to work, but kept optional in
  // the schema so prebuild/expo-doctor stay green before the backend is wired
  // into a given environment.
  EXPO_PUBLIC_CONVEX_URL: z.string().url().optional(),
  EXPO_PUBLIC_CONVEX_SITE_URL: z.string().url().optional(),
  // Google OAuth client ids (public). Presence drives the client-side
  // capability checks that decide whether to show the Google button.
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  // Apple Sign In toggle (public). The server holds the actual credentials;
  // this flag just tells the iOS client whether to surface the button.
  EXPO_PUBLIC_APPLE_AUTH_ENABLED: z.string().optional(),
  // Email + password sign-in (public). Off by default: the template ships
  // passwordless-first (email OTP + social). "true"/"1" surfaces the password
  // path and the create-account flow. Read as a string, coerced where consumed.
  EXPO_PUBLIC_PASSWORD_AUTH_ENABLED: z.string().optional(),
  // Optional global auth gate (public). "true"/"1" gates the whole app behind
  // sign-in; absent/anything else leaves the app open (the default). Read as a
  // string and coerced where consumed (see src/features/auth/config.ts).
  EXPO_PUBLIC_AUTH_REQUIRED: z.string().optional(),
  // Optional biometric app-lock (public). "true"/"1" compiles the lock feature
  // in; absent/anything else leaves it out (the default). Read as a string and
  // coerced where consumed (see src/features/auth/biometric-lock/config.ts).
  EXPO_PUBLIC_BIOMETRIC_LOCK: z.string().optional(),
  // Sentry DSN (public). Presence turns crash/error reporting on; absent leaves
  // Sentry a no-op (see src/lib/sentry.ts). Source-map upload creds are
  // build-only secrets, not part of the client schema.
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
  // RevenueCat publishable API keys (public, platform-specific). The matching
  // platform key being set turns in-app purchases on; absent leaves the
  // purchases feature a no-op (see src/features/purchases/config.ts).
  // EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID overrides the default "pro".
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: z.string().optional(),
  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: z.string().optional(),
  EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID: z.string().optional(),
  // Optional Settings rows (public). Each value, when present, surfaces its row
  // in the Settings screen; absent leaves the row hidden (see
  // src/features/settings/links.ts).
  EXPO_PUBLIC_SUPPORT_EMAIL: z.string().email().optional(),
  EXPO_PUBLIC_GITHUB_URL: z.string().url().optional(),
  EXPO_PUBLIC_WEBSITE_URL: z.string().url().optional(),

  // Base URL for the example REST data layer (src/lib/api). Optional: when
  // unset, apiFetch only works with absolute URLs and the example hook is inert.
  EXPO_PUBLIC_API_URL: z.string().url().optional(),

  // only available for app.config.ts usage
  APP_BUILD_ONLY_VAR: z.string().optional(),
});

const EXPO_PUBLIC_APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV ??
  "development") as z.infer<typeof envSchema>["EXPO_PUBLIC_APP_ENV"];

// Per-environment native identifiers. Exported for unit tests; the rename
// instructions in the docs point here.
export const BUNDLE_IDS = {
  development: "com.expoforge.development",
  preview: "com.expoforge.preview",
  production: "com.expoforge",
} as const;

export const PACKAGES = {
  development: "com.expoforge.development",
  preview: "com.expoforge.preview",
  production: "com.expoforge",
} as const;

// Preview gets its own scheme so a preview build can sit beside production on
// one device with unambiguous deep-link routing. Development reuses the
// production scheme deliberately: dev builds route through the Expo dev client,
// and the production scheme is what the Convex deployment's auth emails target
// (SITE_URL=expoforge://), so dev sign-in links resolve without extra config.
export const SCHEMES = {
  development: "expoforge",
  preview: "expoforge.preview",
  production: "expoforge",
} as const;

const NAME = "Expo Forge";

// Set by the prebuild:* scripts and every eas.json build profile so builds
// abort on missing/invalid config; absent for `expo start` so local dev only
// warns and can run with a partial .env.
const STRICT_ENV_VALIDATION = process.env.STRICT_ENV_VALIDATION === "1";

/** Coerce public string flags. Only "true" and "1" are enabled. */
export function readPublicBooleanFlag(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

/** Return a trimmed public env value, or undefined when blank/unset. */
export function readOptionalPublicString(
  value: string | undefined
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Validate optional client-visible HTTP origins without crashing local dev. */
export function readOptionalPublicHttpUrl(
  value: string | undefined
): string | undefined {
  const trimmed = readOptionalPublicString(value);
  if (!trimmed) {
    return undefined;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:"
      ? trimmed
      : undefined;
  } catch {
    return undefined;
  }
}

const _env: z.infer<typeof envSchema> = {
  EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_NAME: NAME,
  EXPO_PUBLIC_SCHEME: SCHEMES[EXPO_PUBLIC_APP_ENV],
  EXPO_PUBLIC_BUNDLE_ID: BUNDLE_IDS[EXPO_PUBLIC_APP_ENV],
  EXPO_PUBLIC_PACKAGE: PACKAGES[EXPO_PUBLIC_APP_ENV],
  EXPO_PUBLIC_VERSION: packageJSON.version,
  EXPO_PUBLIC_ASSOCIATED_DOMAIN: process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN,
  EXPO_PUBLIC_VAR_NUMBER: Number(process.env.EXPO_PUBLIC_VAR_NUMBER ?? 0),
  EXPO_PUBLIC_VAR_BOOL: process.env.EXPO_PUBLIC_VAR_BOOL === "true",
  EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
  EXPO_PUBLIC_CONVEX_SITE_URL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_APPLE_AUTH_ENABLED: process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED,
  EXPO_PUBLIC_PASSWORD_AUTH_ENABLED:
    process.env.EXPO_PUBLIC_PASSWORD_AUTH_ENABLED,
  EXPO_PUBLIC_AUTH_REQUIRED: process.env.EXPO_PUBLIC_AUTH_REQUIRED,
  EXPO_PUBLIC_BIOMETRIC_LOCK: process.env.EXPO_PUBLIC_BIOMETRIC_LOCK,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY:
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY:
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID:
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID,
  EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
  EXPO_PUBLIC_GITHUB_URL: process.env.EXPO_PUBLIC_GITHUB_URL,
  EXPO_PUBLIC_WEBSITE_URL: process.env.EXPO_PUBLIC_WEBSITE_URL,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  APP_BUILD_ONLY_VAR: process.env.APP_BUILD_ONLY_VAR,
};

// `strict` is passed explicitly (rather than read from the module) so the
// throw-on-invalid contract is unit-testable. When strict, an invalid env
// aborts the build; otherwise it is tolerated so local dev can run partial.
export function getValidatedEnv(
  env: z.infer<typeof envSchema>,
  strict: boolean
): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    if (strict) {
      console.error(
        `❌ Invalid environment variables:${JSON.stringify(
          parsed.error.flatten().fieldErrors,
          null,
          2
        )}\n❌ Missing variables in .env file for APP_ENV=${env.EXPO_PUBLIC_APP_ENV}` +
          "\n💡 Tip: If you recently updated the .env file, try restarting with -c flag to clear the cache."
      );
      throw new Error("Invalid environment variables");
    }
    return env;
  }

  if (strict) {
    console.log("✅ Environment variables validated successfully");
  }
  return parsed.data;
}

const Env = getValidatedEnv(_env, STRICT_ENV_VALIDATION);

export default Env;
