import { cleanup, screen, setup } from "@/lib/test-utils";
import { HomeScreen } from "../home-screen";

// Drives the auth seam (HomeGreeting -> getMe). `null` is the logged-out
// default the home screen must render correctly with the backend off.
let mockUser: unknown = null;
jest.mock("@/lib/convex", () => ({
  useQuery: () => mockUser,
}));

jest.mock("convex/_generated/api", () => ({
  api: { users: { getMe: "getMe" } },
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ push: mockPush }),
}));

afterEach(cleanup);
beforeEach(() => {
  mockUser = null;
  mockPush.mockClear();
});

describe("HomeScreen", () => {
  it("renders the hero and quick-start cards when logged out", () => {
    setup(<HomeScreen />);
    expect(screen.getByText("Expo Forge")).toBeOnTheScreen();
    expect(screen.getByTestId("home-card-style")).toBeOnTheScreen();
    expect(screen.getByTestId("home-card-settings")).toBeOnTheScreen();
  });

  it("shows the sign-in call-to-action when logged out", () => {
    setup(<HomeScreen />);
    expect(screen.getByTestId("home-signin")).toBeOnTheScreen();
    expect(screen.queryByTestId("home-greeting")).not.toBeOnTheScreen();
  });

  it("routes to the Style tab from its quick-start card", async () => {
    const { user } = setup(<HomeScreen />);
    await user.press(screen.getByTestId("home-card-style"));
    expect(mockPush).toHaveBeenCalledWith("/style");
  });

  it("routes to Settings from its quick-start card", async () => {
    const { user } = setup(<HomeScreen />);
    await user.press(screen.getByTestId("home-card-settings"));
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it("greets a signed-in user instead of the sign-in CTA", () => {
    mockUser = { name: "Ada Lovelace", email: "ada@example.com" };
    setup(<HomeScreen />);
    expect(screen.getByTestId("home-greeting")).toBeOnTheScreen();
    expect(screen.queryByTestId("home-signin")).not.toBeOnTheScreen();
  });
});
