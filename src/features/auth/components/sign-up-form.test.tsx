import { cleanup, fireEvent, screen, setup, waitFor } from "@/lib/test-utils";
import { SignUpForm, type SignUpFormProps } from "./sign-up-form";

afterEach(cleanup);

function renderForm(overrides: Partial<SignUpFormProps> = {}) {
  const props: SignUpFormProps = {
    onSubmit: jest.fn(),
    onSignIn: jest.fn(),
    ...overrides,
  };
  return { props, ...setup(<SignUpForm {...props} />) };
}

describe("SignUpForm", () => {
  it("shows required errors when submitted empty", async () => {
    const { user } = renderForm();
    await user.press(screen.getByTestId("sign-up-button"));
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(await screen.findByText(/Name is required/i)).toBeOnTheScreen();
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(screen.getByText(/Email is required/i)).toBeOnTheScreen();
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(screen.getByText(/Password is required/i)).toBeOnTheScreen();
  });

  it("rejects a password under the minimum length", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("name-input"), "Ada");
    await user.type(screen.getByTestId("email-input"), "user@example.com");
    await user.type(screen.getByTestId("password-input"), "short");
    await user.press(screen.getByTestId("sign-up-button"));
    expect(
      // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
      await screen.findByText(/at least 10 characters/i)
    ).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with valid name, email, and password", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("name-input"), "Ada Lovelace");
    await user.type(screen.getByTestId("email-input"), "ada@example.com");
    await user.type(screen.getByTestId("password-input"), "password123");
    await user.press(screen.getByTestId("sign-up-button"));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "password123",
      });
    });
  });

  it("surfaces an inline error returned by onSubmit", async () => {
    const onSubmit = jest.fn().mockResolvedValue("Email already in use");
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("name-input"), "Ada");
    await user.type(screen.getByTestId("email-input"), "ada@example.com");
    await user.type(screen.getByTestId("password-input"), "password123");
    await user.press(screen.getByTestId("sign-up-button"));
    expect(await screen.findByTestId("form-error")).toHaveTextContent(
      "Email already in use"
    );
  });

  it("validates email format on blur", async () => {
    const { user } = renderForm();
    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "nope");
    fireEvent(emailInput, "blur");
    await user.press(screen.getByTestId("sign-up-button"));
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(await screen.findByText(/Invalid email format/i)).toBeOnTheScreen();
  });
});
