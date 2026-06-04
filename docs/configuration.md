# Configuration

Every optional feature is **off by default** and turned on by setting its environment variable(s). Unset = no-op. Set the variable, restart the dev server (`bun run start -c` to clear cache), done — no guard code to edit.

All variables are documented inline in [`.env.example`](../.env.example); this guide explains **how to turn each feature on and where to get the credentials**.

## The switch list

| Feature | Set this | You also need |
| --- | --- | --- |
| Backend + auth | `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL` | A Convex deployment (below) |
| Email + password sign-in | `EXPO_PUBLIC_PASSWORD_AUTH_ENABLED=true` | Backend on |
| Sign in with Apple | `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true` | Apple Developer account |
| Sign in with Google | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (+ `_IOS_`, `_ANDROID_`) | Google Cloud OAuth clients |
| Global login wall | `EXPO_PUBLIC_AUTH_REQUIRED=true` | Backend on |
| Biometric app-lock | `EXPO_PUBLIC_BIOMETRIC_LOCK=true` | — |
| Crash reporting | `EXPO_PUBLIC_SENTRY_DSN` | Sentry project |
| In-app purchases | `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `_ANDROID_API_KEY` | RevenueCat project |
| Universal / app links | `EXPO_PUBLIC_ASSOCIATED_DOMAIN=https://links.you.com` | A domain you host files on |
| Settings rows | `EXPO_PUBLIC_SUPPORT_EMAIL` / `_GITHUB_URL` / `_WEBSITE_URL` | — |
| External REST API | `EXPO_PUBLIC_API_URL` | Your API |

`EXPO_PUBLIC_*` values are **bundled into the app** — only put public, non-secret values there (publishable keys, client IDs, DSNs are fine). Real secrets (server keys, `SENTRY_AUTH_TOKEN`, OAuth client secrets) live on the Convex deployment, EAS, or CI — never in committed files.

## Backend + auth (Convex + Better Auth)

The app runs as a pure frontend until you point it at a Convex deployment.

```sh
bunx convex dev          # provisions a deployment, writes EXPO_PUBLIC_CONVEX_URL
```

Set both `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CONVEX_SITE_URL` in `.env`. **Sign-up works immediately with no email provider** — by default accounts are verified on creation, so a user can sign in without an OTP ever being sent. Wire up email (below) when you want real verification.

Server-side settings live on the Convex deployment, not in `.env`. Set them with `bunx convex env set`:

| Convex env var | Purpose | Default |
| --- | --- | --- |
| `SITE_URL` | Deep-link scheme auth emails target | `expoforge://` — **change to match your scheme** |
| `APP_NAME` | Name shown in auth emails | `Expo Forge` |
| `EMAIL_FROM` | Sender address (required once Resend is on) | — |
| `REQUIRE_EMAIL_VERIFICATION` | Require OTP before sign-in | `false` |

To send real transactional email (OTP, password reset), provision [Resend](https://resend.com), set `EMAIL_FROM`, and flip `REQUIRE_EMAIL_VERIFICATION=true`.

### Sign in with Apple

1. In the [Apple Developer](https://developer.apple.com) portal, enable the **Sign in with Apple** capability for your App ID.
2. Set `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true`. The config plugin adds the entitlement at prebuild and the iOS client surfaces the button. iOS-only.

### Sign in with Google

1. In [Google Cloud Console](https://console.cloud.google.com) → Credentials, create OAuth client IDs: a **Web** client and (for native) **iOS** and **Android** clients.
2. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in `.env`. The iOS URL scheme is derived automatically at prebuild.
3. On the Convex deployment, set `GOOGLE_CLIENT_SECRET` (and the same client IDs as `GOOGLE_WEB_CLIENT_ID` etc.) so the server registers the provider.

> Apple requires that if you offer any third-party social login (Google), you also offer Sign in with Apple (App Store Guideline 4.8). Turn both on together.

## Crash reporting (Sentry)

Set `EXPO_PUBLIC_SENTRY_DSN` (the DSN is public). For source-map upload during EAS builds, also set `SENTRY_ORG` and `SENTRY_PROJECT` in `.env`, and `SENTRY_AUTH_TOKEN` **as an EAS/CI secret only** (it's a real secret). Unset DSN = Sentry is a no-op.

## In-app purchases (RevenueCat)

1. Create a [RevenueCat](https://www.revenuecat.com) project; under **Project settings → API keys**, copy the **publishable** keys (safe to bundle — not the secret server key).
2. Set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and/or `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`. The paywall ([`src/app/paywall.tsx`](../src/app/paywall.tsx)) stays hidden until the key for the running platform is set.
3. Provision the `pro` entitlement, products, and offerings on the dashboard. Override the entitlement name with `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` if it isn't `pro`.

Native-only (no web purchases), and real purchases need a development build, not Expo Go — see [Deployment](deployment.md).

## Universal Links / App Links

Set `EXPO_PUBLIC_ASSOCIATED_DOMAIN=https://links.example.com` (HTTPS host, no port). Then host the association files on that domain:

- iOS: `/.well-known/apple-app-site-association` with your App ID.
- Android: `/.well-known/assetlinks.json` with your signing-cert SHA-256 fingerprint (`autoVerify` is wired for you).

The custom-scheme deep links (`<yourscheme>://...`) work without any of this; the associated domain is only for `https://` links that open your app.

## Removing an optional module

Because everything is env-gated, **leaving a feature off costs nothing** — there's no runtime weight and no setup. Prefer that to deleting code.

If you genuinely want a module gone (clone-and-own), the seams are clean:

- **Backend / auth / push / App Attest:** delete the [`convex/`](../convex) folder and the `@/lib/convex` consumers. The single seam [`src/lib/convex.ts`](../src/lib/convex.ts) already returns signed-out sentinels when no `EXPO_PUBLIC_CONVEX_URL` is set, so the app boots as a pure frontend with the backend off — verify that first; you may not need to delete anything.
- **Reference surfaces:** [`src/features/examples/`](../src/features/examples) (the REST hook convention anchor) and [`src/features/style-demo/`](../src/features/style-demo) + its route [`src/app/(app)/style.tsx`](../src/app/(app)/style.tsx) are demo-only and safe to delete.

After removing anything, run `bun run check-all` and `bunx expo-doctor@latest`.
