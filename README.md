# Expo Forge

Production-ready, open-source **Expo SDK 56** boilerplate for shipping cross-platform apps (iOS · Android · Web).

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Expo SDK 56](https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo&logoColor=white)
![React Native 0.85](https://img.shields.io/badge/React%20Native-0.85-61dafb?logo=react&logoColor=white)
![bun](https://img.shields.io/badge/bun-package%20manager-f9f1e1?logo=bun&logoColor=black)

Expo Forge gives you the essential 80% of a real app — typed env, theming, i18n, optional auth + backend, crash reporting, deep links, CI, and EAS release pipelines — already wired and tested, so you start with features instead of plumbing.

## Features

- **Expo SDK 56** — React 19.2, React Native 0.85, New Architecture, Expo Router (typed routes), web export.
- **Three-tier UI** — Uniwind + Tailwind v4 (engine) → HeroUI Native (`@/components/ui`) → `@expo/ui` native primitives.
- **Optional auth + backend** — [Convex](https://convex.dev) + [Better Auth](https://better-auth.com) (email/password, OTP, Apple, Google). Off by default; the app boots logged-out as a pure frontend.
- **Typed env** — Zod-validated `env.ts` with development / preview / production profiles.
- **i18n** — `i18next`, RTL-ready (English + Arabic), with a translation-parity lint.
- **Theming** — light/dark/system, Dynamic Type, reduced-motion, safe-area aware.
- **Production modules** — Sentry, analytics, push notifications, deep links + Universal Links, offline & OTA banners, error boundary, legal screens.
- **Security** — Apple App Attest, biometric app-lock, rate limiting, soft-delete + restore.
- **CI/CD** — bun GitHub Actions (lint, type-check, translations, tests) and EAS Workflows (build, submit, OTA). Green on a fresh clone with no Expo account.
- **Tooling** — bun, Biome/Ultracite, TypeScript strict, Jest + RNTL, Husky + commitlint.

Every integration is env-gated: unset its variable and it's a no-op.

## Quickstart

**Prerequisites:** [Bun](https://bun.sh) and Node ≥ 20.19.4 (pinned in `.nvmrc`).

```sh
bun install
cp .env.example .env     # every var is optional to start
bun run start            # press i / a / w
```

You now have a working app with onboarding, theming, settings, i18n, and a demo feed — **auth off, no account required**.

Turn on the backend + auth (optional):

```sh
bunx convex dev          # provisions Convex, writes EXPO_PUBLIC_CONVEX_URL
```

Set the Convex URLs in `.env`; email/password and OTP work immediately. See `.env.example` for Apple/Google and the global auth gate — every block is documented.

## Scripts

| Command | Does |
| --- | --- |
| `bun run start` | Expo dev server |
| `bun run ios` / `android` / `web` | Run on a target |
| `bun run prebuild` | Generate native `ios/` + `android/` |
| `bun run type-check` | `tsc --noEmit` |
| `bun run lint` / `format` | Ultracite check / fix |
| `bun run lint:translations` | i18n key parity |
| `bun run test` | Jest + RNTL |
| `bun run check-all` | lint + type-check + translations + test |

## Structure

```
src/
  app/            Expo Router routes (file-based)
  components/ui/  HeroUI-Native component layer (+ native/ for @expo/ui)
  features/       feature-scoped screens, logic, and tests
  lib/            api client, analytics, sentry, deep-link, notifications, i18n, hooks
  translations/   en.json, ar.json
convex/           optional backend (schema, auth, users, push, app attest, crons)
.eas/workflows/   EAS Workflows (build, submit, OTA publish)
env.ts / app.config.ts   typed env + dynamic native config
```

Imports use the `@/*` alias → `src/*`. The `examples` and `style-demo` features are removable reference surfaces.

## Documentation

**Operator manual** ([`docs/`](docs/README.md)) — take this template and ship your app:

- [`docs/getting-started.md`](docs/getting-started.md) — clone, rename to your app, run it
- [`docs/configuration.md`](docs/configuration.md) — turn optional features on/off (auth, backend, payments, crash reporting, deep links)
- [`docs/deployment.md`](docs/deployment.md) — EAS builds, store submission, OTA updates

**Project:**

- [`AGENTS.md`](AGENTS.md) — conventions for AI coding agents
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — dev setup and PR process
- [`SECURITY.md`](SECURITY.md) — responsible disclosure

## Contributing

Issues and PRs welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [`LICENSE`](LICENSE). Expo Forge derives from MIT-licensed projects; attribution is preserved in [`CREDITS.md`](CREDITS.md).
