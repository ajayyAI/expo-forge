# Operator Manual

How to take this template and ship **your** app. Read these in order the first time; after that they're reference.

| Guide | Read it when |
| --- | --- |
| [Getting Started](getting-started.md) | First thing. Clone, rename to your app, run it. |
| [Configuration](configuration.md) | You want to turn on an optional feature (auth, backend, payments, crash reporting, deep links) — or remove one. |
| [Deployment](deployment.md) | You're ready to build and ship to the App Store / Play Store and push OTA updates. |

**The one rule that explains everything:** every integration is **env-gated**. Unset its variable and that feature is a no-op — the app stays green on a fresh clone with an empty `.env`. You opt in by setting a variable, never by deleting guard code. See [Configuration](configuration.md) for the full switch list.

For codebase conventions (how to add a feature, the UI layers, the bun-only rule), see [`AGENTS.md`](../AGENTS.md). For contributing back, see [`CONTRIBUTING.md`](../CONTRIBUTING.md).
