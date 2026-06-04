/**
 * `confirmWithBiometrics` gates a sensitive action behind Face ID / Touch ID
 * but must DEGRADE OPEN: no hardware or no enrollment means there's nothing to
 * prompt with, so it returns true (the action proceeds on the prior Alert
 * confirmation). When a prompt IS shown, its success/failure is passed through.
 */

const mockHasHardware = jest.fn();
const mockIsEnrolled = jest.fn();
const mockAuthenticate = jest.fn();

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: () => mockHasHardware(),
  isEnrolledAsync: () => mockIsEnrolled(),
  authenticateAsync: (...args: unknown[]) => mockAuthenticate(...args),
}));

import { confirmWithBiometrics } from "../biometric";

beforeEach(() => {
  mockHasHardware.mockReset();
  mockIsEnrolled.mockReset();
  mockAuthenticate.mockReset();
});

describe("confirmWithBiometrics", () => {
  it("skips (returns true) when there is no biometric hardware", async () => {
    mockHasHardware.mockResolvedValue(false);
    mockIsEnrolled.mockResolvedValue(true);

    await expect(confirmWithBiometrics("prompt")).resolves.toBe(true);
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it("skips (returns true) when nothing is enrolled", async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(false);

    await expect(confirmWithBiometrics("prompt")).resolves.toBe(true);
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it("prompts and returns true when the user authenticates", async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    mockAuthenticate.mockResolvedValue({ success: true });

    await expect(confirmWithBiometrics("Confirm")).resolves.toBe(true);
    expect(mockAuthenticate).toHaveBeenCalledWith({
      promptMessage: "Confirm",
    });
  });

  it("returns false when an attempted prompt fails or is cancelled", async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    mockAuthenticate.mockResolvedValue({ success: false });

    await expect(confirmWithBiometrics("Confirm")).resolves.toBe(false);
  });

  // Fail-safe: a thrown error must propagate (never resolve to a "proceed")
  // so the caller aborts the sensitive action.
  it("propagates a thrown auth error so the caller aborts", async () => {
    mockHasHardware.mockResolvedValue(true);
    mockIsEnrolled.mockResolvedValue(true);
    mockAuthenticate.mockRejectedValue(new Error("hardware error"));

    await expect(confirmWithBiometrics("Confirm")).rejects.toThrow(
      "hardware error"
    );
  });
});
