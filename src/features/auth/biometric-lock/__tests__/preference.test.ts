/**
 * The app-lock user preference persists in MMKV. Default is OFF — the user
 * opts in. These tests round-trip the plain getter/setter against a mocked
 * `storage` instance.
 */

const store = new Map<string, boolean | undefined>();
const mockGetBoolean = jest.fn((key: string) => store.get(key));
const mockSet = jest.fn((key: string, value: boolean) => {
  store.set(key, value);
});

jest.mock("@/lib/storage", () => ({
  storage: {
    getBoolean: (key: string) => mockGetBoolean(key),
    set: (key: string, value: boolean) => mockSet(key, value),
  },
}));

import {
  getBiometricLockEnabled,
  setBiometricLockEnabled,
} from "../preference";

beforeEach(() => {
  store.clear();
  mockGetBoolean.mockClear();
  mockSet.mockClear();
});

describe("biometric-lock preference", () => {
  it("defaults to false when nothing is stored", () => {
    expect(getBiometricLockEnabled()).toBe(false);
  });

  it("round-trips a stored value", () => {
    setBiometricLockEnabled(true);
    expect(getBiometricLockEnabled()).toBe(true);

    setBiometricLockEnabled(false);
    expect(getBiometricLockEnabled()).toBe(false);
  });
});
