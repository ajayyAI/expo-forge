# Deployment

Build with EAS, submit to the stores, and push over-the-air updates. None of this needs an Expo account until you actually build in the cloud — local development and CI stay green without one.

## One-time setup

```sh
bunx eas login
bunx eas init            # creates/links the EAS project, writes the project ID
```

Then wire two build-time variables so production builds and OTA updates resolve:

- `EAS_PROJECT_ID` — your EAS project ID (from `eas init`).
- `EXPO_ACCOUNT_OWNER` — your Expo account/org owner.

Set these in your EAS [environment variables](https://docs.expo.dev/eas/environment-variables/) (or `.env` for local prebuild). Make sure `slug` in [`app.config.ts`](../app.config.ts) matches your EAS project slug.

## Build profiles

Defined in [`eas.json`](../eas.json). Each pins `EXPO_PUBLIC_APP_ENV` and `STRICT_ENV_VALIDATION=1`, so a build **aborts on missing/invalid env** rather than shipping a misconfigured app.

| Profile | Distribution | Output | Use for |
| --- | --- | --- | --- |
| `development` | internal | dev client | Day-to-day device development. |
| `simulator` | internal | iOS simulator build | Running on a simulator without signing. |
| `preview` | store | iOS store build + Android APK | TestFlight / internal QA. |
| `production` | store | iOS + Android App Bundle | Store release. |

App version comes from `version` in [`package.json`](../package.json); build numbers auto-increment remotely (`cli.appVersionSource: "remote"`, `autoIncrement: true`).

## Build

```sh
# convenience scripts (see package.json) — e.g.
bun run build:development:ios
bun run build:preview:android
bun run build:production:ios

# or directly
bunx eas build --profile production --platform all
```

A **development build** (not Expo Go) is required to exercise native modules — auth providers, push, biometrics, App Attest, and RevenueCat purchases. Build the `development` profile once and run `bun run start` against it.

## Submit to the stores

You'll need an Apple Developer account and a Google Play Console account with the app records created.

```sh
bunx eas submit --profile production --platform ios
bunx eas submit --profile production --platform android
```

Fill credentials into the `submit.production` block of [`eas.json`](../eas.json) (App Store Connect app ID / API key, Play service-account JSON) or let EAS prompt you.

## Over-the-air updates

Ship JS-only changes without a new store build:

```sh
bunx eas update --channel production --message "Fix copy on paywall"
```

`runtimeVersion` uses the `appVersion` policy ([`app.config.ts`](../app.config.ts)): an update only reaches builds whose native version is compatible, so a bump to a native dependency forces a real release instead of a silent OTA. The in-app update banner stays inert until an EAS project is configured, so this is safe to leave unwired during early development.

## CI / automation

- **GitHub Actions** (`.github/workflows/ci.yml`) runs lint, type-check, translation parity, and tests on every push — on bun, no Expo account needed.
- **EAS Workflows** ([`.eas/workflows/`](../.eas/workflows)) define `build-preview`, `build-production` (build → submit), and `publish-update`. They have no auto-trigger, so a fresh clone gets green CI with zero EAS setup; run them when you're ready:

```sh
bunx eas workflow:run build-production.yml
```

## Pre-flight checklist

```sh
bun run check-all                      # lint + type-check + translations + tests
bunx expo-doctor@latest                # native config sanity
bunx expo export --platform web        # web bundle builds
```

Confirm identifiers, icons, and your accent color are yours ([Getting Started](getting-started.md)) and that every feature you shipped has its env var set in the EAS production environment ([Configuration](configuration.md)).
