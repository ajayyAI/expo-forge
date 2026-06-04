import { cleanup, screen, setup, waitFor } from "@/lib/test-utils";
import {
  ForgotPasswordForm,
  type ForgotPasswordFormProps,
} from "./forgot-password-form";

afterEach(cleanup);

function renderForm(overrides: Partial<ForgotPasswordFormProps> = {}) {
  const props: ForgotPasswordFormProps = {
    onSubmit: jest.fn(),
    onSignIn: jest.fn(),
    ...overrides,
  };
  return { props, ...setup(<ForgotPasswordForm {...props} />) };
}

describe("ForgotPasswordForm", () => {
  it("requires an email", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.press(screen.getByTestId("forgot-password-button"));
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(await screen.findByText(/Email is required/i)).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the email", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("email-input"), "user@example.com");
    await user.press(screen.getByTestId("forgot-password-button"));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("user@example.com");
    });
  });

  it("surfaces an inline error returned by onSubmit", async () => {
    const onSubmit = jest.fn().mockResolvedValue("No account found");
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("email-input"), "user@example.com");
    await user.press(screen.getByTestId("forgot-password-button"));
    expect(await screen.findByTestId("form-error")).toHaveTextContent(
      "No account found"
    );
  });

  it("invokes onSignIn from the sign-in link", async () => {
    const onSignIn = jest.fn();
    const { user } = renderForm({ onSignIn });
    await user.press(screen.getByTestId("sign-in-link"));
    expect(onSignIn).toHaveBeenCalled();
  });
});
