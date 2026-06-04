/**
 * First-launch gate on the home route. The redirect runs in an effect rather
 * than render-phase, because a render-phase redirect raced the not-yet-mounted
 * navigator on cold start and resolved to +not-found. These cover both the
 * first-time (redirect, withhold Home) and returning-user (render Home) paths.
 */

import { cleanup, render, screen, waitFor } from "@/lib/test-utils";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ replace: mockReplace }),
}));

let mockIsFirstTime = true;
jest.mock("@/lib/hooks/use-is-first-time", () => ({
  useIsFirstTime: () => [mockIsFirstTime, jest.fn()],
}));

jest.mock("@/features/home/home-screen", () => {
  const { Text } = require("react-native");
  const { createElement } = require("react");
  return {
    HomeScreen: () => createElement(Text, { testID: "home-screen" }, "home"),
  };
});

import Index from "../index";

afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

describe("home route first-launch gate", () => {
  it("redirects first-time users to onboarding and withholds Home", async () => {
    mockIsFirstTime = true;
    render(<Index />);
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/onboarding")
    );
    expect(screen.queryByTestId("home-screen")).toBeNull();
  });

  it("renders Home for returning users without redirecting", () => {
    mockIsFirstTime = false;
    render(<Index />);
    expect(screen.getByTestId("home-screen")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
