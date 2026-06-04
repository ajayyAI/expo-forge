import { cleanup, render, screen } from "@/lib/test-utils";

import { LoadingScreen } from "./loading-screen";

afterEach(cleanup);

describe("LoadingScreen", () => {
  it("renders the indicator", () => {
    render(<LoadingScreen testID="loader" />);
    expect(screen.getByTestId("loader")).toBeOnTheScreen();
  });

  it("renders a plain message when provided", () => {
    render(<LoadingScreen message="Hang tight" />);
    expect(screen.getByText("Hang tight")).toBeOnTheScreen();
  });

  it("renders a translated message via tx", () => {
    render(<LoadingScreen tx="common.loading" />);
    expect(screen.getByText("Loading...")).toBeOnTheScreen();
  });
});
