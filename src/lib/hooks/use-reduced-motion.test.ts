import { useReducedMotion } from "react-native-reanimated";

import { useReducedMotion as seam } from "./use-reduced-motion";

jest.mock("react-native-reanimated", () => ({
  useReducedMotion: jest.fn(),
}));

const mocked = useReducedMotion as jest.Mock;

afterEach(() => mocked.mockReset());

describe("useReducedMotion seam", () => {
  it("returns true when the OS setting is enabled", () => {
    mocked.mockReturnValue(true);
    expect(seam()).toBe(true);
  });

  it("returns false when the OS setting is disabled", () => {
    mocked.mockReturnValue(false);
    expect(seam()).toBe(false);
  });
});
