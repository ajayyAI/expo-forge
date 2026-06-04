# Contributing to Expo Forge

Thanks for your interest in improving Expo Forge. Issues and pull requests are welcome.

## Development setup

**Prerequisites:** [Bun](https://bun.sh) and Node ≥ 20.19.4 (pinned in `.nvmrc`).

```sh
bun install
cp .env.example .env     # every var is optional to start
bun run start
```

This project uses **bun** for everything. Don't use npm, yarn, pnpm, or npx — use `bun install`, `bun run <script>`, and `bunx <tool>`.

## Before you open a PR

Run the full gate and make sure it's green:

```sh
bun run check-all        # lint + type-check + translations + tests
```

Individually:

| Command | Checks |
| --- | --- |
| `bun run lint` | Ultracite (Biome) lint |
| `bun run format` | Auto-fix lint/format |
| `bun run type-check` | TypeScript (`tsc --noEmit`) |
| `bun run lint:translations` | i18n key parity (en/ar) |
| `bun run test` | Jest + React Native Testing Library |

## Conventions

- **TypeScript strict**, `@/*` imports map to `src/*`.
- **Keep features self-contained.** New feature → `src/features/<name>/` with its screens, logic, `components/`, and `__tests__/`. The route file in `src/app/` is a thin re-export.
- **Use the UI layer.** Prefer existing `@/components/ui` components before raw React Native.
- **Env-gate integrations.** A new third-party service must be a no-op when its env var is unset, so a fresh clone stays green with an empty `.env`. Add the var to `env.ts` and document it in `.env.example`.
- **Tests for logic.** Pure functions and Convex functions should have tests.
- **Comments explain *why*, not *what*.** Match the surrounding style.

See [`AGENTS.md`](AGENTS.md) for the full conventions cheat-sheet.

## Commits & PRs

- Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, ...). Commitlint enforces this.
- Keep PRs focused. Fill in the PR template.
- Be kind — see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting bugs / requesting features

Use the issue templates. For security issues, **do not** open a public issue — see [`SECURITY.md`](SECURITY.md).
