/**
 * AuthGate is the optional auth boundary. By default apps boot logged-out and
 * the gate is inert; it only redirects to sign-in when auth is required —
 * either globally (`AUTH_REQUIRED` env) or per-screen (`<AuthGate required>`).
 * These tests pin that contract: default-open, the two ways to activate the
 * gate, the authenticated pass-through, and the no-flash loading state.
 */

import { ActivityIndicator, Text } from "react-native";

import { cleanup, render, screen } from "@/lib/test-utils";

// Mutable session state so each case can simulate loading / out / in.
interface MockSession {
  data: { session?: unknown } | null;
  isPending: boolean;
}
let mockSession: MockSession = { data: null, isPending: false };
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockSession,
  },
}));

// Mutable getMe result: `undefined` = loading, `null` = no user, an object with
// `deletedAt` = a soft-deleted (deletion-pending) account.
let mockMe: unknown = null;
jest.mock("@/lib/convex", () => ({
  useQuery: () => mockMe,
}));
jest.mock("convex/_generated/api", () => ({
  api: { users: { getMe: "getMe" } },
}));

// Mutable global flag so each case can flip AUTH_REQUIRED.
let mockAuthRequired = false;
jest.mock("../config", () => ({
  get AUTH_REQUIRED() {
    return mockAuthRequired;
  },
}));

// Render Redirect as an inspectable element instead of pulling in the router
// runtime, so a case can assert the redirect target by querying the tree.
jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: { href: string }) => (
      <Text testID="redirect">{href}</Text>
    ),
  };
});

const SIGN_IN_HREF = "/login";
const RESTORE_HREF = "/restore-account";

// Import after mocks are in place so the component binds to them.
function loadAuthGate() {
  let mod: typeof import("../auth-gate");
  jest.isolateModules(() => {
    mod = require("../auth-gate");
  });
  // biome-ignore lint/style/noNonNullAssertion: assigned synchronously inside isolateModules.
  return mod!.AuthGate;
}

function Child() {
  return <Text>protected-content</Text>;
}

describe("AuthGate", () => {
  beforeEach(() => {
    mockSession = { data: null, isPending: false };
    mockAuthRequired = false;
    mockMe = null;
  });

  afterEach(cleanup);

  it("renders children logged-out when auth is not required (default)", () => {
    const AuthGate = loadAuthGate();
    render(
      <AuthGate>
        <Child />
      </AuthGate>
    );
    expect(screen.getByText("protected-content")).toBeOnTheScreen();
    expect(screen.queryByTestId("redirect")).not.toBeOnTheScreen();
  });

  it("redirects to sign-in when the global flag is on and there is no session", () => {
    mockAuthRequired = true;
    const AuthGate = loadAuthGate();
    render(
      <AuthGate>
        <Child />
      </AuthGate>
    );
    expect(screen.queryByText("protected-content")).not.toBeOnTheScreen();
    expect(screen.getByTestId("redirect")).toHaveTextContent(SIGN_IN_HREF);
  });

  it("redirects when `required` protects a screen even if the global flag is off", () => {
    mockAuthRequired = false;
    const AuthGate = loadAuthGate();
    render(
      <AuthGate required>
        <Child />
      </AuthGate>
    );
    expect(screen.queryByText("protected-content")).not.toBeOnTheScreen();
    expect(screen.getByTestId("redirect")).toHaveTextContent(SIGN_IN_HREF);
  });

  it("renders children when `required={false}` opts a screen out of a globally-gated app", () => {
    mockAuthRequired = true;
    const AuthGate = loadAuthGate();
    render(
      <AuthGate required={false}>
        <Child />
      </AuthGate>
    );
    expect(screen.getByText("protected-content")).toBeOnTheScreen();
    expect(screen.queryByTestId("redirect")).not.toBeOnTheScreen();
  });

  it("renders children when the gate is active and the session is authenticated", () => {
    mockAuthRequired = true;
    mockSession = { data: { session: { id: "s1" } }, isPending: false };
    const AuthGate = loadAuthGate();
    render(
      <AuthGate>
        <Child />
      </AuthGate>
    );
    expect(screen.getByText("protected-content")).toBeOnTheScreen();
    expect(screen.queryByTestId("redirect")).not.toBeOnTheScreen();
  });

  it("redirects a signed-in soft-deleted user to restore, even with auth not required", () => {
    mockAuthRequired = false;
    mockSession = { data: { session: { id: "s1" } }, isPending: false };
    mockMe = { deletedAt: 123 };
    const AuthGate = loadAuthGate();
    render(
      <AuthGate>
        <Child />
      </AuthGate>
    );
    expect(screen.queryByText("protected-content")).not.toBeOnTheScreen();
    expect(screen.getByTestId("redirect")).toHaveTextContent(RESTORE_HREF);
  });

  it("holds the loader while getMe resolves for a signed-in user (no flash)", () => {
    mockAuthRequired = true;
    mockSession = { data: { session: { id: "s1" } }, isPending: false };
    mockMe = undefined;
    const AuthGate = loadAuthGate();
    render(
      <AuthGate>
        <Child />
      </AuthGate>
    );
    expect(screen.queryByText("protected-content")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("redirect")).not.toBeOnTheScreen();
    expect(screen.getByTestId("auth-gate-loading")).toBeOnTheScreen();
  });

  it("renders children for a signed-in user whose account is not deleted", () => {
    mockAuthRequired = true;
    mockSession = { data: { session: { id: "s1" } }, isPending: false };
    mockMe = { deletedAt: undefined };
    const AuthGate = loadAuthGate();
    render(
      <AuthGate>
        <Child />
      </AuthGate>
    );
    expect(screen.getByText("protected-content")).toBeOnTheScreen();
    expect(screen.queryByTestId("redirect")).not.toBeOnTheScreen();
  });

  it("shows the loader (no children, no redirect) while the session resolves", () => {
    mockAuthRequired = true;
    mockSession = { data: null, isPending: true };
    const AuthGate = loadAuthGate();
    render(
      <AuthGate>
        <Child />
      </AuthGate>
    );
    expect(screen.queryByText("protected-content")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("redirect")).not.toBeOnTheScreen();
    expect(screen.getByTestId("auth-gate-loading")).toBeOnTheScreen();
    // Confirm the user actually sees a spinner, not just an empty container.
    // (getByType throws if absent; a composite instance isn't a host element,
    // so assert on its presence rather than with toBeOnTheScreen.)
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});
