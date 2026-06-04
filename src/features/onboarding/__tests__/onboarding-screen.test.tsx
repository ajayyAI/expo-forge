/**
 * First-launch onboarding. Verifies the screen renders its headline and CTA,
 * and that starting marks onboarding complete and routes to home.
 */

import { translate } from "@/lib/i18n";
import { cleanup, fireEvent, render, screen } from "@/lib/test-utils";
import { OnboardingScreen } from "../onboarding-screen";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ replace: mockReplace }),
}));

const mockSetIsFirstTime = jest.fn();
jest.mock("@/lib/hooks", () => ({
  ...jest.requireActual("@/lib/hooks"),
  useIsFirstTime: () => [false, mockSetIsFirstTime],
}));

// Native polish tier — the SF Symbol glyph and material Surface are irrelevant
// to behavior; render the icon inert and the surface as a plain passthrough.
jest.mock("@/components/ui/native", () => {
  const { View } = require("react-native");
  const { createElement } = require("react");
  return {
    Icon: () => null,
    Surface: (props: { children: unknown }) =>
      createElement(View, null, props.children),
  };
});

afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

describe("OnboardingScreen", () => {
  it("renders the headline and call to action", () => {
    render(<OnboardingScreen />);
    expect(screen.getByText(translate("onboarding.title"))).toBeTruthy();
    expect(screen.getByTestId("onboarding-get-started")).toBeTruthy();
  });

  it("completes onboarding and routes to home on start", () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId("onboarding-get-started"));
    expect(mockSetIsFirstTime).toHaveBeenCalledWith(false);
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});
