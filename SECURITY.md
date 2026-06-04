# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately via [GitHub Security Advisories][advisories]
("Report a vulnerability" on the repository's Security tab), or by contacting the
maintainer directly.

Please include a description of the issue, steps to reproduce, and the affected
versions or components. We'll acknowledge your report and keep you updated on the
fix.

## Secrets

Only `.env.example` is tracked. Never commit real secrets. Client values use the
`EXPO_PUBLIC_` prefix and are inlined into the app bundle (treat as public);
server secrets live on the Convex deployment, EAS, or CI.

[advisories]: https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability
