import { cleanup, render, screen } from "@/lib/test-utils";

import { SkeletonList } from "./skeleton-list";

const ROW_ID = /^skeleton-row-\d+$/;

afterEach(cleanup);

describe("SkeletonList", () => {
  it("renders the default number of rows", () => {
    render(<SkeletonList testID="skeleton" />);
    expect(screen.getAllByTestId(ROW_ID)).toHaveLength(6);
  });

  it("renders a custom count", () => {
    render(<SkeletonList count={3} testID="skeleton" />);
    expect(screen.getAllByTestId(ROW_ID)).toHaveLength(3);
  });

  it("exposes the first row at the testID-derived id", () => {
    render(<SkeletonList testID="skeleton" />);
    expect(screen.getByTestId("skeleton-row-0")).toBeOnTheScreen();
  });
});
