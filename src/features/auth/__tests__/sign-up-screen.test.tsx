/**
 * SignUpScreen branches on the sign-up response: a returned `token` means
 * autoSignIn gave us a live session (go straight in), while a null token means
 * verification is on and an OTP was emailed (step to the code screen). These
 * tests pin both outcomes by driving a valid submit and asserting navigation.
 */

import { cleanup, screen, setup, waitFor } from "@/lib/test-utils";
import { SignUpScreen } from "../sign-up-screen";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ replace: mockReplace }),
}));

const mockSignUpEmail = jest.fn();
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: {
      email: (...args: unknown[]) => mockSignUpEmail(...args),
    },
  },
}));

async function submitValidForm() {
  const { user } = setup(<SignUpScreen />);
  await user.type(screen.getByTestId("name-input"), "Ada Lovelace");
  await user.type(screen.getByTestId("email-input"), "ada@example.com");
  await user.type(screen.getByTestId("password-input"), "password123");
  await user.press(screen.getByTestId("sign-up-button"));
}

describe("SignUpScreen sign-up response branching", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSignUpEmail.mockReset();
  });

  afterEach(cleanup);

  it("navigates home when a token is returned (verification off)", async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { token: "live-session-token" },
      error: null,
    });

    await submitValidForm();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByTestId("otp-title")).not.toBeOnTheScreen();
  });

  it("steps to OTP verification when no token is returned (verification on)", async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { token: null },
      error: null,
    });

    await submitValidForm();

    expect(await screen.findByTestId("otp-title")).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
