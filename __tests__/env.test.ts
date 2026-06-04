import {
  BUNDLE_IDS,
  envSchema,
  getValidatedEnv,
  PACKAGES,
  SCHEMES,
} from "../env";

const validEnv = {
  EXPO_PUBLIC_APP_ENV: "development",
  EXPO_PUBLIC_NAME: "Expo Forge",
  EXPO_PUBLIC_SCHEME: "expoforge",
  EXPO_PUBLIC_BUNDLE_ID: "com.expoforge.development",
  EXPO_PUBLIC_PACKAGE: "com.expoforge.development",
  EXPO_PUBLIC_VERSION: "1.0.0",
  EXPO_PUBLIC_VAR_NUMBER: 0,
  EXPO_PUBLIC_VAR_BOOL: false,
} as const;

describe("envSchema", () => {
  it("accepts a complete env with only required vars", () => {
    expect(envSchema.safeParse(validEnv).success).toBe(true);
  });

  it("rejects a missing required var (name)", () => {
    const { EXPO_PUBLIC_NAME, ...withoutName } = validEnv;
    const result = envSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("rejects a string where a number is expected (no implicit coercion)", () => {
    const result = envSchema.safeParse({
      ...validEnv,
      EXPO_PUBLIC_VAR_NUMBER: "5",
    });
    expect(result.success).toBe(false);
  });

  describe("associated domain (universal links)", () => {
    it("accepts an https URL with no port", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_ASSOCIATED_DOMAIN: "https://links.example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a non-https scheme", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_ASSOCIATED_DOMAIN: "http://links.example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an https URL with an explicit port", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_ASSOCIATED_DOMAIN: "https://links.example.com:8443",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("getValidatedEnv", () => {
  const invalidEnv = {
    ...validEnv,
    EXPO_PUBLIC_VAR_NUMBER: "not-a-number",
  } as unknown as typeof validEnv;

  it("throws on invalid env when strict (the build/release gate)", () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    expect(() => getValidatedEnv(invalidEnv, true)).toThrow(
      "Invalid environment variables"
    );
    errorSpy.mockRestore();
  });

  it("returns the env untouched on invalid input when not strict", () => {
    expect(getValidatedEnv(invalidEnv, false)).toBe(invalidEnv);
  });

  it("returns parsed data on valid env", () => {
    const logSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    expect(getValidatedEnv(validEnv, true)).toMatchObject(validEnv);
    logSpy.mockRestore();
  });
});

describe("per-environment identifiers", () => {
  it("covers all three environments", () => {
    for (const map of [BUNDLE_IDS, PACKAGES, SCHEMES]) {
      expect(Object.keys(map).sort()).toEqual([
        "development",
        "preview",
        "production",
      ]);
    }
  });

  it("keeps bundle id and package identical per environment", () => {
    expect(PACKAGES).toEqual(BUNDLE_IDS);
  });

  it("suffixes non-production identifiers off the production base", () => {
    expect(BUNDLE_IDS.production).toBe("com.expoforge");
    expect(BUNDLE_IDS.development).toBe(`${BUNDLE_IDS.production}.development`);
    expect(BUNDLE_IDS.preview).toBe(`${BUNDLE_IDS.production}.preview`);
  });

  it("gives preview a distinct scheme so it can be installed alongside production", () => {
    expect(SCHEMES.preview).not.toBe(SCHEMES.production);
  });
});
