import { cleanup, screen, setup } from "@/lib/test-utils";

import { EmptyState } from "./empty-state";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders the title", () => {
    setup(<EmptyState testID="empty" title="ui.empty.title" />);
    expect(screen.getByText("Nothing here yet")).toBeOnTheScreen();
  });

  it("renders the subtitle when provided", () => {
    setup(
      <EmptyState
        subtitle="ui.empty.subtitle"
        testID="empty"
        title="ui.empty.title"
      />
    );
    expect(
      screen.getByText("There's nothing to show right now.")
    ).toBeOnTheScreen();
  });

  it("renders an action and calls onAction when pressed", async () => {
    const onAction = jest.fn();
    const { user } = setup(
      <EmptyState
        actionLabel="sessions.retry"
        onAction={onAction}
        testID="empty"
        title="ui.empty.title"
      />
    );
    await user.press(screen.getByTestId("empty-action"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders no action without an actionLabel", () => {
    setup(<EmptyState testID="empty" title="ui.empty.title" />);
    expect(screen.queryByTestId("empty-action")).not.toBeOnTheScreen();
  });
});
