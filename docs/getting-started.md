# Getting Started

From clone to a running, rebranded app. ~15 minutes.

## 1. Run it as-is

```sh
bun install
cp .env.example .env     # every var is optional to start
bun run start            # press i (iOS), a (Android), or w (web)
```

You now have a working app — onboarding, theming, settings, i18n, a starter home — with **auth off and no account required**. Confirm it boots before changing anything.

> **bun only.** Never npm / yarn / pnpm / npx. Use `bun install`, `bun run <script>`, `bunx <tool>`.

## 2. Make it yours — identifiers

The app name, URL scheme, and native bundle/package IDs are **code constants**, not `.env` values. They live in one place so a rename is a handful of edits.

Pick your values:

| Thing | Example | Rule |
| --- | --- | --- |
| Display name | `Acme` | Anything. |
| iOS bundle ID / Android package | `com.acme` | Reverse-DNS, must be globally unique on the stores. |
| URL scheme | `acme` | Lowercase, no spaces; used for deep links and auth callbacks. |
| Slug | `acme` | Your EAS project slug (see [Deployment](deployment.md)). |

Then edit:

| File | What to change |
| --- | --- |
| [`env.ts`](../env.ts) | `NAME` (display name), and the `BUNDLE_IDS`, `PACKAGES`, `SCHEMES` maps. Keep the per-env suffixes (`.development`, `.preview`) so dev/preview/production builds can coexist on one device. |
| [`app.config.ts`](../app.config.ts) | `slug` (currently `"expo-forge"`). |
| [`package.json`](../package.json) | `name` and `repository.url`. `version` here is your app's user-facing version. |
| [`convex/env.ts`](../convex/env.ts) | The `siteUrl` default (`"expoforge://"` → `"<yourscheme>://"`) and `appName`. The scheme **must match** `SCHEMES.production` — auth sign-in emails deep-link back through it. |
| [`src/translations/en.json`](../src/translations/en.json) + `ar.json` | The `onboarding.title` (`"Expo Forge"`) and any other copy that names the app. |

Storage-key prefixes (`expo-forge.*`) in [`src/lib/app-attest.ts`](../src/lib/app-attest.ts) and [`src/features/auth/biometric-lock/preference.ts`](../src/features/auth/biometric-lock/preference.ts) are namespaced to the old name. Renaming them is optional (cosmetic), but if you do, change them before shipping — they key persisted device state.

**Update the test fixtures** that pin the old identifiers, or the suite fails: `__tests__/env.test.ts`, `src/lib/__tests__/deep-link.test.ts`, `convex/__tests__/http.test.ts`, `src/features/home/__tests__/home-screen.test.tsx`, and the `.maestro/` flows. A repo-wide find for `expoforge`, `expo-forge`, and `Expo Forge` surfaces every spot.

## 3. Make it yours — brand

**Icons & splash** — replace the four PNGs in [`assets/images/`](../assets/images), keeping the filenames:

| File | Size | Notes |
| --- | --- | --- |
| `icon.png` | 1024×1024 | App icon (iOS + fallback). |
| `adaptive-icon.png` | 1024×1024 | Android foreground; keep art inside the centre ~66% safe zone. |
| `splash-icon.png` | ~512 wide | Shown at `imageWidth: 150`; transparent background. |
| `favicon.png` | 48×48 | Web. |

The framing colors are in [`app.config.ts`](../app.config.ts): splash and Android adaptive backgrounds (`#FFFFFF`) and the notification tint (`#2E3C4B`). Update them to suit your icon.

**Accent color** — the primary ramp is defined twice and both must match:

- [`src/components/ui/colors.js`](../src/components/ui/colors.js) — the `primary` object (JS source for components).
- [`src/global.css`](../src/global.css) — the `--color-primary-*` tokens (Tailwind v4 engine).

Replace both ramps with your brand's 50→900 scale. Light/dark are handled by the theme layer ([`src/components/ui/theme.ts`](../src/components/ui/theme.ts)); you usually only touch the ramp.

**Fonts** are Inter, configured in the `expo-font` plugin block of `app.config.ts`. Swap the font files and family there if you want a different typeface.

## 4. Verify

```sh
bun run check-all        # lint + type-check + translations + tests — keep it green
```

For anything touching native config (identifiers, icons, plugins), regenerate native projects and sanity-check:

```sh
bunx expo prebuild --clean
bunx expo-doctor@latest
```

## Next

- Turn on a backend, auth, payments, or crash reporting → [Configuration](configuration.md)
- Ship it → [Deployment](deployment.md)
