/**
 * SoftDeleteRedirect is the app-wide safety net mounted above the root Stack.
 * Routes outside the `(app)` group (e.g. `/profile`, `/sessions`) never pass
 * through AuthGate, so a signed-in user mid-deletion could otherwise reach
 * them. These tests pin the imperative redirect: it fires only for a
 * soft-deleted user with a live session who isn't already on the restore
 * screen, stays inert otherwise, and always renders its children so the
 * navigator never unmounts.
 */

import { Text } from "react-native";

import { cleanup, render, screen, waitFor } from "@/lib/test-utils";

import { SoftDeleteRedirect } from "../soft-delete-redirect";

interface MockSession {
  data: { session?: unknown } | null;
}
let mockSession: MockSession = { data: null };
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockSession,
  },
}));

let mockMe: unknown = null;
jest.mock("@/lib/convex", () => ({
  useQuery: () => mockMe,
}));
jest.mock("convex/_generated/api", () => ({
  api: { users: { getMe: "getMe" } },
}));

let mockSegments: string[] = [];
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useSegments: () => mockSegments,
  useRouter: () => ({ replace: mockReplace }),
}));

const RESTORE_HREF = "/restore-account";

function Child() {
  return <Text testID="child">child-content</Text>;
}

describe("SoftDeleteRedirect", () => {
  beforeEach(() => {
    mockSession = { data: null };
    mockMe = null;
    mockSegments = [];
    mockReplace.mockClear();
  });

  afterEach(cleanup);

  it("redirects a signed-in soft-deleted user off a leaked route to restore", async () => {
    mockSession = { data: { session: { id: "s1" } } };
    mockMe = { deletedAt: 123 };
    mockSegments = ["profile"];
    render(
      <SoftDeleteRedirect>
        <Child />
      </SoftDeleteRedirect>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(RESTORE_HREF);
    });
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("child")).toBeOnTheScreen();
  });

  it("does not redirect when already on the restore screen (no loop)", async () => {
    mockSession = { data: { session: { id: "s1" } } };
    mockMe = { deletedAt: 123 };
    mockSegments = ["restore-account"];
    render(
      <SoftDeleteRedirect>
        <Child />
      </SoftDeleteRedirect>
    );
    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeOnTheScreen();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not redirect a signed-in user whose account is not deleted", async () => {
    mockSession = { data: { session: { id: "s1" } } };
    mockMe = { deletedAt: undefined };
    mockSegments = ["profile"];
    render(
      <SoftDeleteRedirect>
        <Child />
      </SoftDeleteRedirect>
    );
    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeOnTheScreen();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("stays inert without a session even if getMe reports a deletion", async () => {
    mockSession = { data: null };
    mockMe = { deletedAt: 123 };
    mockSegments = ["profile"];
    render(
      <SoftDeleteRedirect>
        <Child />
      </SoftDeleteRedirect>
    );
    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeOnTheScreen();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not redirect while getMe is still loading", async () => {
    mockSession = { data: { session: { id: "s1" } } };
    mockMe = undefined;
    mockSegments = ["profile"];
    render(
      <SoftDeleteRedirect>
        <Child />
      </SoftDeleteRedirect>
    );
    await waitFor(() => {
      expect(screen.getByTestId("child")).toBeOnTheScreen();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
