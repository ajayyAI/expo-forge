/**
 * The in-app Privacy/Terms screens render placeholder copy that the app owner
 * must replace before shipping. These tests confirm each renders its title plus
 * the visible placeholder notice without crashing.
 */

import { translate } from "@/lib/i18n";
import { cleanup, render, screen } from "@/lib/test-utils";
import { PrivacyScreen } from "../privacy-screen";
import { TermsScreen } from "../terms-screen";

// Stack.Screen only sets navigation options; render it inert here.
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: { Screen: () => null },
}));

afterEach(cleanup);

describe("legal screens", () => {
  it("renders the privacy title and placeholder notice", () => {
    render(<PrivacyScreen />);
    expect(screen.getByTestId("privacy-screen")).toBeTruthy();
    expect(
      screen.getAllByText(translate("legal.privacy.title")).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(translate("legal.placeholder_notice"))
    ).toBeTruthy();
  });

  it("renders the terms title and placeholder notice", () => {
    render(<TermsScreen />);
    expect(screen.getByTestId("terms-screen")).toBeTruthy();
    expect(
      screen.getAllByText(translate("legal.terms.title")).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(translate("legal.placeholder_notice"))
    ).toBeTruthy();
  });
});
