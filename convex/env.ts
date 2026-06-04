const optional = (key: string, fallback: string): string =>
  process.env[key] ?? fallback;

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const bool = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) {
    return fallback;
  }
  return value === "true" || value === "1";
};

const optionalVar = (key: string): string | undefined => process.env[key];

export const env = {
  get convexSiteUrl() {
    return required("CONVEX_SITE_URL");
  },
  siteUrl: optional("SITE_URL", "expoforge://"),
  appName: optional("APP_NAME", "Expo Forge"),
  email: {
    get from() {
      return required("EMAIL_FROM");
    },
  },
  // Email verification policy. Default `false` (minimal setup, no Resend
  // configured): sign-up creates verified-immediately accounts so the user
  // can sign in without ever seeing an OTP. Flip this to `true` on the
  // Convex env once Resend is provisioned to require verification.
  requireEmailVerification: bool("REQUIRE_EMAIL_VERIFICATION", false),
  // Google OAuth (cross-platform). Optional: when unset, the Google provider
  // is not registered server-side and the client hides the button via the
  // capability checks. The id-token flow accepts tokens issued for any of the
  // web / iOS / Android client ids, so all three are passed as an array of
  // accepted audiences. Lazy getters keep module load + deploy green when
  // Google is not configured (the common case for a fresh boilerplate).
  google: {
    get clientIds(): string[] {
      return [
        optionalVar("GOOGLE_WEB_CLIENT_ID"),
        optionalVar("GOOGLE_IOS_CLIENT_ID"),
        optionalVar("GOOGLE_ANDROID_CLIENT_ID"),
        // Back-compat single-value form.
        optionalVar("GOOGLE_CLIENT_ID"),
      ].filter((value): value is string => !!value);
    },
    get clientSecret(): string | undefined {
      return optionalVar("GOOGLE_CLIENT_SECRET");
    },
  },
} as const;
