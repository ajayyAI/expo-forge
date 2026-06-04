// Jest setup for the "convex" project.
//
// convex/auth.ts pulls in the full Better Auth builder stack (better-auth,
// @better-auth/expo, plugins) purely to construct `createAuth`. The
// account-lifecycle code paths under test never call `createAuth` — they only
// use `authComponent` (the Convex client wrapper) and the app's own helpers.
// Those builder packages are ESM with a deep dependency tree that is painful
// to downlevel for the Edge runtime, so we stub them. The real packages are
// used at deploy/runtime; this stubbing is test-only.

jest.mock("@better-auth/expo", () => ({ expo: () => ({}) }));
jest.mock("better-auth/minimal", () => ({ betterAuth: () => ({}) }));
jest.mock("better-auth/plugins", () => ({
  emailOTP: () => ({}),
  username: () => ({}),
}));
jest.mock("@convex-dev/better-auth/plugins", () => ({ convex: () => ({}) }));
