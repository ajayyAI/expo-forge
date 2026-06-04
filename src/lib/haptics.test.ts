import * as Haptics from "expo-haptics";

import { impact, isEnabled, notify, selection, setEnabled } from "./haptics";
import { storage } from "./storage";

// jest-setup mocks this module globally; this suite tests the real thing.
jest.mock("./haptics", () => jest.requireActual("./haptics"));

const getBoolean = storage.getBoolean as jest.Mock;
const set = storage.set as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // Unset preference: haptics default to on.
  getBoolean.mockReturnValue(undefined);
});

describe("haptics", () => {
  it("fires a selection tick when enabled (the default)", () => {
    selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("stays silent when the user has turned haptics off", () => {
    getBoolean.mockReturnValue(false);

    selection();
    impact();
    notify();

    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("maps an impact style to the platform feedback enum", () => {
    impact("medium");
    expect(Haptics.impactAsync).toHaveBeenCalledWith("medium");
  });

  it("maps a notify type to the platform feedback enum", () => {
    notify("error");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
  });

  it("reports enabled when no preference is stored", () => {
    expect(isEnabled()).toBe(true);
  });

  it("persists the preference", () => {
    setEnabled(false);
    expect(set).toHaveBeenCalledWith("HAPTICS_ENABLED", false);
  });
});
