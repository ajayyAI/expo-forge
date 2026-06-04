import { cancelAnimation, withRepeat } from "react-native-reanimated";

import { cleanup, render, screen } from "@/lib/test-utils";

import { Skeleton } from "./skeleton";

const mockReducedMotion = jest.fn();
jest.mock("@/lib/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

afterEach(() => {
  cleanup();
  (withRepeat as jest.Mock).mockClear();
  (cancelAnimation as jest.Mock).mockClear();
});

describe("Skeleton", () => {
  it("renders", () => {
    mockReducedMotion.mockReturnValue(false);
    render(<Skeleton testID="skeleton" />);
    expect(screen.getByTestId("skeleton")).toBeOnTheScreen();
  });

  it("pulses when reduced motion is off", () => {
    mockReducedMotion.mockReturnValue(false);
    render(<Skeleton testID="skeleton" />);
    expect(withRepeat).toHaveBeenCalled();
  });

  it("does not pulse when reduced motion is on", () => {
    mockReducedMotion.mockReturnValue(true);
    render(<Skeleton testID="skeleton" />);
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it("cancels the pulse on unmount", () => {
    mockReducedMotion.mockReturnValue(false);
    const { unmount } = render(<Skeleton testID="skeleton" />);
    unmount();
    expect(cancelAnimation).toHaveBeenCalled();
  });
});
