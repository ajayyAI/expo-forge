import { cleanup, screen, setup, waitFor } from "@/lib/test-utils";
import {
  ResetPasswordForm,
  type ResetPasswordFormProps,
} from "./reset-password-form";

afterEach(cleanup);

function renderForm(overrides: Partial<ResetPasswordFormProps> = {}) {
  const props: ResetPasswordFormProps = {
    email: "user@example.com",
    onSubmit: jest.fn(),
    onResend: jest.fn(),
    ...overrides,
  };
  return { props, ...setup(<ResetPasswordForm {...props} />) };
}

async function fillValid(user: ReturnType<typeof setup>["user"]) {
  await user.type(screen.getByTestId("otp-input"), "123456");
  await user.type(screen.getByTestId("password-input"), "password123");
  await user.type(screen.getByTestId("confirm-password-input"), "password123");
}

describe("ResetPasswordForm", () => {
  it("rejects a non-6-digit code", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("otp-input"), "123");
    await user.type(screen.getByTestId("password-input"), "password123");
    await user.type(
      screen.getByTestId("confirm-password-input"),
      "password123"
    );
    await user.press(screen.getByTestId("reset-password-button"));
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(await screen.findByText(/6-digit code/i)).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("otp-input"), "123456");
    await user.type(screen.getByTestId("password-input"), "password123");
    await user.type(
      screen.getByTestId("confirm-password-input"),
      "different99"
    );
    await user.press(screen.getByTestId("reset-password-button"));
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(await screen.findByText(/don't match/i)).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the code and new password", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await fillValid(user);
    await user.press(screen.getByTestId("reset-password-button"));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        otp: "123456",
        password: "password123",
      });
    });
  });

  it("surfaces an inline error returned by onSubmit", async () => {
    const onSubmit = jest.fn().mockResolvedValue("Code expired");
    const { user } = renderForm({ onSubmit });
    await fillValid(user);
    await user.press(screen.getByTestId("reset-password-button"));
    expect(await screen.findByTestId("form-error")).toHaveTextContent(
      "Code expired"
    );
  });

  it("calls onResend from the resend button", async () => {
    const onResend = jest.fn();
    const { user } = renderForm({ onResend });
    await user.press(screen.getByTestId("otp-resend-button"));
    await waitFor(() => {
      expect(onResend).toHaveBeenCalled();
    });
  });
});
