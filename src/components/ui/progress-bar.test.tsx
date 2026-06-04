import { createRef } from "react";
import { withTiming } from "react-native-reanimated";

import { cleanup, render } from "@/lib/test-utils";

import { ProgressBar, type ProgressBarRef } from "./progress-bar";

const mockReducedMotion = jest.fn();
jest.mock("@/lib/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => mockReducedMotion(),
}));

afterEach(() => {
  cleanup();
  (withTiming as jest.Mock).mockClear();
});

describe("ProgressBar reduced-motion", () => {
  it("animates with withTiming when reduced motion is off", () => {
    mockReducedMotion.mockReturnValue(false);
    const ref = createRef<ProgressBarRef>();
    render(<ProgressBar ref={ref} />);
    ref.current?.setProgress(80);
    expect(withTiming).toHaveBeenCalledWith(80, expect.any(Object));
  });

  it("jumps to the target without withTiming when reduced motion is on", () => {
    mockReducedMotion.mockReturnValue(true);
    const ref = createRef<ProgressBarRef>();
    render(<ProgressBar ref={ref} />);
    ref.current?.setProgress(80);
    expect(withTiming).not.toHaveBeenCalled();
  });
});
