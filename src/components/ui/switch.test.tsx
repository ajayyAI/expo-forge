import { cleanup, fireEvent, screen, setup } from "@/lib/test-utils";

import { Switch } from "./switch";

afterEach(cleanup);

describe("<Switch />", () => {
  it("renders with its accessibilityLabel", () => {
    setup(
      <Switch
        accessibilityLabel="toggle notifications"
        testID="switch"
        value={false}
      />
    );
    expect(screen.getByTestId("switch")).toBeOnTheScreen();
    expect(screen.getByTestId("switch").props.accessibilityLabel).toBe(
      "toggle notifications"
    );
  });

  it("calls onValueChange with the new value when toggled", () => {
    const mockOnValueChange = jest.fn();
    setup(
      <Switch
        accessibilityLabel="toggle"
        onValueChange={mockOnValueChange}
        testID="switch"
        value={false}
      />
    );
    fireEvent(screen.getByTestId("switch"), "valueChange", true);
    expect(mockOnValueChange).toHaveBeenCalledTimes(1);
    expect(mockOnValueChange).toHaveBeenCalledWith(true);
  });

  it("renders an optional label", () => {
    setup(
      <Switch
        accessibilityLabel="toggle"
        label="Enable notifications"
        testID="switch"
        value={false}
      />
    );
    expect(screen.getByTestId("switch-label")).toBeOnTheScreen();
    expect(screen.getByTestId("switch-label")).toHaveTextContent(
      "Enable notifications"
    );
  });

  it("reflects the value prop", () => {
    setup(<Switch accessibilityLabel="toggle" testID="switch" value={true} />);
    expect(screen.getByTestId("switch").props.value).toBe(true);
  });
});
