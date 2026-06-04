import { Text } from "react-native";

import * as haptics from "@/lib/haptics";
import { cleanup, screen, setup } from "@/lib/test-utils";

import { PressableScale } from "./pressable-scale";

jest.mock("@/lib/haptics", () => ({ selection: jest.fn() }));

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("PressableScale", () => {
  it("renders its children", () => {
    setup(
      <PressableScale testID="ps">
        <Text>Tap me</Text>
      </PressableScale>
    );
    expect(screen.getByText("Tap me")).toBeOnTheScreen();
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    const { user } = setup(
      <PressableScale onPress={onPress} testID="ps">
        <Text>Tap me</Text>
      </PressableScale>
    );
    await user.press(screen.getByTestId("ps"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("fires a selection haptic on press", async () => {
    const { user } = setup(
      <PressableScale testID="ps">
        <Text>Tap me</Text>
      </PressableScale>
    );
    await user.press(screen.getByTestId("ps"));
    expect(haptics.selection).toHaveBeenCalled();
  });

  it("skips the haptic when haptic is disabled", async () => {
    const { user } = setup(
      <PressableScale haptic={false} testID="ps">
        <Text>Tap me</Text>
      </PressableScale>
    );
    await user.press(screen.getByTestId("ps"));
    expect(haptics.selection).not.toHaveBeenCalled();
  });
});
