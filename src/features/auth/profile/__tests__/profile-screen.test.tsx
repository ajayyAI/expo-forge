/**
 * ProfileScreen loads the current user via getMe and routes the name change to
 * Better Auth and the bio change to Convex. These tests pin the three states
 * (loading, logged-out redirect, loaded) and the split-write behaviour: only
 * the fields that actually changed get persisted.
 */

import { cleanup, screen, setup, waitFor } from "@/lib/test-utils";
import { ProfileScreen } from "../profile-screen";

// Mutable getMe result; mutations are spies returning resolved promises.
let mockUser: unknown;
const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockDeleteAccount = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/convex", () => ({
  useQuery: () => mockUser,
  useMutation: () => mockUpdateProfile,
  useAction: () => mockDeleteAccount,
  // null skips the attestation branch in useDeleteAccount; this suite covers
  // load/save states, not deletion crypto.
  convexClient: null,
}));

jest.mock("@/lib/app-attest", () => ({
  buildAttestation: jest.fn().mockResolvedValue(null),
  createAppAttestClient: jest.fn(),
}));

jest.mock("convex/_generated/api", () => ({
  api: {
    users: { getMe: "getMe", updateProfile: "updateProfile" },
    userActions: { deleteAccount: "deleteAccount" },
  },
}));

const mockUpdateUser = jest.fn();
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    updateUser: (...args: unknown[]) => mockUpdateUser(...args),
  },
}));

const MockRedirect = ({ href }: { href: string }) => {
  const { Text } = require("react-native");
  return <Text testID="redirect">{href}</Text>;
};
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Redirect: (props: { href: string }) => MockRedirect(props),
  Stack: { Screen: () => null },
}));

const LOADED_USER = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  bio: "Mathematician",
  avatarUrl: null,
  image: null,
  hasUploadedAvatar: false,
};

afterEach(cleanup);
beforeEach(() => {
  mockUpdateProfile.mockClear();
  mockUpdateUser.mockReset();
  mockUpdateUser.mockResolvedValue({ error: null });
});

describe("ProfileScreen", () => {
  it("shows a loader while getMe is undefined", () => {
    mockUser = undefined;
    setup(<ProfileScreen />);
    expect(screen.getByTestId("profile-loading")).toBeOnTheScreen();
  });

  it("redirects to login when getMe is null", () => {
    mockUser = null;
    setup(<ProfileScreen />);
    expect(screen.getByTestId("redirect")).toHaveTextContent("/login");
  });

  it("saves only the bio when only the bio changed", async () => {
    mockUser = LOADED_USER;
    const { user } = setup(<ProfileScreen />);
    await user.type(screen.getByTestId("bio-input"), " and poet");
    await user.press(screen.getByTestId("save-button"));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        bio: "Mathematician and poet",
      });
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("routes a name change to Better Auth", async () => {
    mockUser = LOADED_USER;
    const { user } = setup(<ProfileScreen />);
    await user.clear(screen.getByTestId("name-input"));
    await user.type(screen.getByTestId("name-input"), "Grace Hopper");
    await user.press(screen.getByTestId("save-button"));
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ name: "Grace Hopper" });
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
