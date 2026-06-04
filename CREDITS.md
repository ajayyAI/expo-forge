# Credits & Attribution

expo-forge is an open-source (MIT) Expo boilerplate that derives from, and ports
code/patterns out of, several MIT-licensed projects. Per the MIT license, the
copyright and permission notices of each source are preserved here. Our gratitude
to the authors below — this template would not exist without their work.

## Obytes — `react-native-template-obytes`

- License: MIT © Obytes
- Source: https://github.com/obytes/react-native-template-obytes
- What we use: This boilerplate is **forked from the Obytes v9 app shell**. The
  foundational structure derives from it — project layout (`src/` feature
  organization), the Expo Router setup, the Zod-validated environment system
  (`env.ts`), the Uniwind + Tailwind v4 styling baseline, the Jest + React Native
  Testing Library setup, i18n scaffolding, and the original GitHub Actions CI
  workflows.

## vexpo — by Ramon Claudio

- License: MIT © Ramon Claudio
- Source: https://github.com/ramonclaudio/vexpo (template `templates/default`)
- What we use: The production backend and release slices — Convex schema and
  functions, Better Auth server/client wiring,
  App Attest integration, biometric helpers, push token lifecycle, EAS Workflows
  (`.eas/workflows/`), and fingerprinted OTA update configuration.

## HeroUI Native

- License: MIT © HeroUI
- Source: https://github.com/heroui-inc/heroui-native
- What we use: The default component layer that sits on top of the Uniwind
  engine — buttons, inputs, and other UI primitives, plus its
  Tailwind preset and theming.

---

If you ship an app built on expo-forge, attribution is appreciated but not
required beyond preserving this notice and the bundled `LICENSE`.
