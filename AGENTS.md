# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Copilot, etc.) working in Expo Forge. Humans: this doubles as a conventions cheat-sheet.

> **Expo moves fast.** Read the exact versioned docs at <https://docs.expo.dev/versions/v56.0.0/> before writing native or SDK code — your training data may be stale.

## Stack at a glance

- **Expo SDK 56** · React 19.2 · React Native 0.85 · New Architecture · Expo Router (typed routes) · web export.
- **Package manager: bun.** Never use npm, yarn, pnpm, or npx. Use `bun install`, `bun run <script>`, `bunx <tool>`.
- **Node 24 LTS** (pinned in `.nvmrc`); `>=20.19.4` is the supported floor in `package.json` engines. Tooling runs on Node; bun is only the package manager.
- **UI:** Uniwind + Tailwind v4 (engine) → HeroUI Native (`@/components/ui`) → `@expo/ui` (native primitives). Prefer existing `@/components/ui` components before reaching for raw RN.
- **Backend (optional):** Convex + Better Auth. **Off by default.** Keep it cleanly removable.
- **Lint/format:** Biome via Ultracite. **Tests:** Jest + React Native Testing Library + convex-test.
- **Lang:** TypeScript strict. Imports use the `@/*` → `src/*` alias.

## Golden rules

1. **bun only.** Any `npm`/`yarn`/`pnpm`/`npx` in a command, script, or doc is wrong.
2. **Keep auth/backend self-contained.** Auth code stays under `src/features/auth/` and `convex/`. Route files are thin re-exports. Don't import `authClient` or `api.*` outside the auth feature and its existing seams (`src/app/_layout.tsx`, the AuthGate, `src/lib`).
3. **Env-gate new integrations.** A new third-party service must be a no-op when its env var is unset — the template must stay green on a fresh clone with empty `.env`. Add the var to `env.ts` (Zod schema) **and** document it in `.env.example`.
4. **No secrets in git.** Only `.env.example` is tracked. Never write real keys into committed files. Server secrets live on the Convex deployment / EAS / CI.
5. **No "AI-slop" comments.** Comments explain *why*, not *what*. No `// import the thing`, no narrating the obvious. Match the surrounding code's density and idiom.
6. **No upstream-project names** (the templates this derives from) anywhere except `CREDITS.md`.

## Workflow

- **Verify before claiming done.** Run the relevant gates and paste real output. Don't assert "tests pass" without running them.
- **TDD for logic.** Pure functions, resolvers, and Convex functions get tests first. UI gets RNTL tests for behavior, not snapshots-for-snapshots'-sake.
- **Match conventions.** Read a neighboring file before writing a new one — naming, structure, and idioms should be indistinguishable from existing code.
- **Keep features self-contained.** New feature → `src/features/<name>/` with its screens, logic, `components/`, and `__tests__/`. Route file in `src/app/` is a thin re-export.

## Gates (run before finishing any change)

```sh
bun run type-check          # tsc --noEmit — must be 0 errors
bun run lint                # ultracite check — must be clean
bun run lint:translations   # i18n key parity (en/ar)
bun run test                # jest — keep green
bun run check-all           # all of the above in sequence
```

For native/config changes, also: `bunx expo-doctor@latest` and `bunx expo export --platform web`.

## What you can't verify here

Real iOS/Android device runs, Apple/Google sign-in, biometrics, push delivery, OTA apply, App Attest crypto against Apple's servers, and in-app purchases **cannot be exercised in CI**. Don't claim they're verified without a real device run.

## Git

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`...), enforced by commitlint.
- **Never** `git push`, change remotes, or create/rename/delete/switch branches unless the human explicitly asks. Commit on the current working branch only.

## Adding a REST API integration

Convex is the primary backend; this layer is for external/third-party REST APIs. The provider is already mounted (`APIProvider` in `src/app/_layout.tsx`) and `apiFetch<T>` (a typed `fetch` wrapper that throws `ApiError` on non-2xx) lives in `src/lib/api`. Set `EXPO_PUBLIC_API_URL`, then define a typed `useQuery`/`useMutation` hook colocated in the feature's `api.ts`:

```ts
export function useThing(id: string) {
  return useQuery({
    queryKey: ["thing", id],
    queryFn: () => apiFetch<Thing>(`/things/${id}`),
  });
}
```

See `src/features/examples/api.ts` for the reference hook.

Need your own **server** endpoints? Use Convex (`convex/`). If you remove Convex, Expo Router API Routes (`+api.ts`) are the Expo-native alternative — they require `"output": "server"` and a deployed server (EAS Hosting, Vercel, etc.).

## Pointers

- Env reference: `.env.example` (every block is documented)
- Contributor guide: `CONTRIBUTING.md`
