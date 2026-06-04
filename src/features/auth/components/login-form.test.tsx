import { cleanup, fireEvent, screen, setup, waitFor } from "@/lib/test-utils";
import { LoginForm, type LoginFormProps } from "./login-form";

afterEach(cleanup);

function renderForm(overrides: Partial<LoginFormProps> = {}) {
  const props: LoginFormProps = {
    onPasswordSubmit: jest.fn(),
    onOtpRequest: jest.fn(),
    otpEnabled: true,
    passwordEnabled: true,
    onForgotPassword: jest.fn(),
    onCreateAccount: jest.fn(),
    ...overrides,
  };
  return { props, ...setup(<LoginForm {...props} />) };
}

describe("LoginForm", () => {
  it("renders the sign-in title", async () => {
    renderForm();
    expect(await screen.findByTestId("form-title")).toBeOnTheScreen();
  });

  it("defaults to passwordless OTP — no password field", () => {
    renderForm();
    expect(screen.queryByTestId("password-input")).not.toBeOnTheScreen();
  });

  it("requests a code with just an email by default", async () => {
    const onOtpRequest = jest.fn();
    const { user } = renderForm({ onOtpRequest });
    await user.type(screen.getByTestId("email-input"), "user@example.com");
    await user.press(screen.getByTestId("sign-in-button"));
    await waitFor(() => {
      expect(onOtpRequest).toHaveBeenCalledWith("user@example.com");
    });
  });

  it("validates the email format", async () => {
    const { user } = renderForm();
    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "nope");
    fireEvent(emailInput, "blur");
    await user.press(screen.getByTestId("sign-in-button"));
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(await screen.findByText(/Invalid email format/i)).toBeOnTheScreen();
  });

  it("switches to password mode and submits credentials", async () => {
    const onPasswordSubmit = jest.fn();
    const { user } = renderForm({ onPasswordSubmit });
    await user.press(screen.getByTestId("toggle-auth-mode"));
    await user.type(screen.getByTestId("email-input"), "user@example.com");
    await user.type(screen.getByTestId("password-input"), "password123");
    await user.press(screen.getByTestId("sign-in-button"));
    await waitFor(() => {
      expect(onPasswordSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
          password: "password123",
        })
      );
    });
  });

  it("hides the password toggle and create-account when password is disabled", () => {
    renderForm({ passwordEnabled: false });
    expect(screen.queryByTestId("toggle-auth-mode")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("create-account-link")).not.toBeOnTheScreen();
  });

  it("starts in password mode when OTP is unavailable", () => {
    renderForm({ otpEnabled: false });
    expect(screen.getByTestId("password-input")).toBeOnTheScreen();
    expect(screen.queryByTestId("toggle-auth-mode")).not.toBeOnTheScreen();
  });

  it("surfaces an inline error returned by onPasswordSubmit", async () => {
    const onPasswordSubmit = jest.fn().mockResolvedValue("Bad credentials");
    const { user } = renderForm({ onPasswordSubmit });
    await user.press(screen.getByTestId("toggle-auth-mode"));
    await user.type(screen.getByTestId("email-input"), "user@example.com");
    await user.type(screen.getByTestId("password-input"), "password123");
    await user.press(screen.getByTestId("sign-in-button"));
    expect(await screen.findByTestId("form-error")).toHaveTextContent(
      "Bad credentials"
    );
  });
});
