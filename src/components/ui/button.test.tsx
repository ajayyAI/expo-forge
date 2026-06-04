import { Text } from "react-native";

import { cleanup, render, screen, setup } from "@/lib/test-utils";

import { Button } from "./button";

afterEach(cleanup);

describe("button component ", () => {
  it("should render correctly ", () => {
    render(<Button testID="button" />);
    expect(screen.getByTestId("button")).toBeOnTheScreen();
  });
  it("should render correctly if we add explicit child ", () => {
    render(
      <Button testID="button">
        <Text> Custom child </Text>
      </Button>
    );
    expect(screen.getByText("Custom child")).toBeOnTheScreen();
  });
  it("should render the label correctly", () => {
    render(<Button label="Submit" testID="button" />);
    expect(screen.getByTestId("button")).toBeOnTheScreen();
    expect(screen.getByText("Submit")).toBeOnTheScreen();
  });
  it("should render the loading indicator correctly", () => {
    render(<Button loading={true} testID="button" />);
    expect(screen.getByTestId("button")).toBeOnTheScreen();
    expect(screen.getByTestId("button-activity-indicator")).toBeOnTheScreen();
  });
  it("should call onClick handler when clicked", async () => {
    const onClick = jest.fn();
    const { user } = setup(
      <Button label="Click the button" onPress={onClick} testID="button" />
    );
    expect(screen.getByTestId("button")).toBeOnTheScreen();
    await user.press(screen.getByTestId("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it("should be disabled when loading", async () => {
    const onClick = jest.fn();
    const { user } = setup(
      <Button
        label="Click the button"
        loading={true}
        onPress={onClick}
        testID="button"
      />
    );
    expect(screen.getByTestId("button")).toBeOnTheScreen();
    expect(screen.getByTestId("button-activity-indicator")).toBeOnTheScreen();
    expect(screen.getByTestId("button")).toBeDisabled();
    await user.press(screen.getByTestId("button"));
    expect(onClick).toHaveBeenCalledTimes(0);
  });
  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled={true} testID="button" />);
    expect(screen.getByTestId("button")).toBeDisabled();
  });
  it("shouldn't call onClick when disabled", async () => {
    const onClick = jest.fn();
    const { user } = setup(
      <Button
        disabled={true}
        label="Click the button"
        onPress={onClick}
        testID="button"
        variant="secondary"
      />
    );
    expect(screen.getByTestId("button")).toBeOnTheScreen();
    await user.press(screen.getByTestId("button"));

    expect(screen.getByTestId("button")).toBeDisabled();

    expect(onClick).toHaveBeenCalledTimes(0);
  });
  it("should apply correct styles based on size prop", () => {
    render(<Button size="lg" testID="button" />);
    const button = screen.getByTestId("button");
    // TODO: should be fixed to use haveStyle instead of comparing the class name
    const expectedStyle =
      "font-inter font-semibold text-white dark:text-black text-xl";
    const receivedStyle =
      button.props.children[0].props.children.props.className;
    expect(receivedStyle).toContain(expectedStyle);
  });
  it("should apply correct styles for label when variant is secondary", () => {
    render(<Button label="Submit" testID="button" variant="secondary" />);
    const button = screen.getByTestId("button");

    const expectedStyle =
      "font-inter font-semibold text-secondary-600 text-base";
    const receivedStyle =
      button.props.children[0].props.children.props.className;
    expect(receivedStyle).toContain(expectedStyle);
  });
  it("should apply correct styles for label when is disabled", () => {
    render(<Button disabled label="Submit" testID="button" />);
    const button = screen.getByTestId("button");

    const expectedStyle =
      "font-inter font-semibold text-base text-neutral-600 dark:text-neutral-600";
    const receivedStyle =
      button.props.children[0].props.children.props.className;
    expect(receivedStyle).toContain(expectedStyle);
  });
});
