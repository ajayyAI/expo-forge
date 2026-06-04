import { Text } from "react-native";

import { cleanup, render, screen } from "@/lib/test-utils";

import { AnimatedListItem } from "./animated-list-item";

afterEach(cleanup);

describe("AnimatedListItem", () => {
  it("renders its children", () => {
    render(
      <AnimatedListItem>
        <Text>Row content</Text>
      </AnimatedListItem>
    );
    expect(screen.getByText("Row content")).toBeOnTheScreen();
  });

  it("forwards testID", () => {
    render(
      <AnimatedListItem testID="row">
        <Text>Row content</Text>
      </AnimatedListItem>
    );
    expect(screen.getByTestId("row")).toBeOnTheScreen();
  });

  it("renders children when index is provided", () => {
    render(
      <AnimatedListItem index={3} testID="row">
        <Text>Staggered row</Text>
      </AnimatedListItem>
    );
    expect(screen.getByTestId("row")).toBeOnTheScreen();
    expect(screen.getByText("Staggered row")).toBeOnTheScreen();
  });
});
