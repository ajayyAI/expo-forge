import { cleanup, screen, setup, waitFor } from "@/lib/test-utils";
import { ProfileForm, type ProfileFormProps } from "./profile-form";

afterEach(cleanup);

function renderForm(overrides: Partial<ProfileFormProps> = {}) {
  const props: ProfileFormProps = {
    initialValues: { name: "Ada Lovelace", bio: "Mathematician" },
    email: "ada@example.com",
    onSubmit: jest.fn(),
    ...overrides,
  };
  return { props, ...setup(<ProfileForm {...props} />) };
}

describe("ProfileForm", () => {
  it("disables Save until something changes", () => {
    renderForm();
    expect(screen.getByTestId("save-button")).toBeDisabled();
  });

  it("enables Save once the name changes and submits trimmed values", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.clear(screen.getByTestId("name-input"));
    await user.type(screen.getByTestId("name-input"), "  Grace Hopper  ");
    await user.press(screen.getByTestId("save-button"));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Grace Hopper",
        bio: "Mathematician",
      });
    });
  });

  it("rejects a bio over the 500-character limit", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.clear(screen.getByTestId("bio-input"));
    await user.paste(screen.getByTestId("bio-input"), "x".repeat(501));
    await user.press(screen.getByTestId("save-button"));
    expect(
      // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
      await screen.findByText(/500 characters or less/i)
    ).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const onSubmit = jest.fn();
    const { user } = renderForm({ onSubmit });
    await user.clear(screen.getByTestId("name-input"));
    await user.type(screen.getByTestId("bio-input"), " more");
    await user.press(screen.getByTestId("save-button"));
    // biome-ignore lint/performance/useTopLevelRegex: not a hot path (test/script)
    expect(await screen.findByText(/Name is required/i)).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a success message after a clean save", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("bio-input"), " update");
    await user.press(screen.getByTestId("save-button"));
    expect(await screen.findByTestId("save-success")).toBeOnTheScreen();
  });

  it("surfaces an inline error returned by onSubmit", async () => {
    const onSubmit = jest.fn().mockResolvedValue("Could not save your changes");
    const { user } = renderForm({ onSubmit });
    await user.type(screen.getByTestId("bio-input"), " update");
    await user.press(screen.getByTestId("save-button"));
    expect(await screen.findByTestId("form-error")).toHaveTextContent(
      "Could not save your changes"
    );
  });

  it("renders email as read-only", () => {
    renderForm();
    expect(screen.getByTestId("email-input").props.editable).toBe(false);
  });

  it("shows the read-only email value", () => {
    renderForm({ email: "ada@example.com" });
    expect(screen.getByTestId("email-input").props.value).toBe(
      "ada@example.com"
    );
  });
});
