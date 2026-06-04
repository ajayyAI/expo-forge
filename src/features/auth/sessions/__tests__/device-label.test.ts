import { deviceLabel } from "../device-label";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const LINUX = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";

describe("deviceLabel", () => {
  it("labels an iPhone (even though its UA also contains 'Mac OS X')", () => {
    expect(deviceLabel(IPHONE)).toBe("iPhone");
  });

  it("labels an iPad", () => {
    expect(deviceLabel(IPAD)).toBe("iPad");
  });

  it("labels Android before its Linux substring matches", () => {
    expect(deviceLabel(ANDROID)).toBe("Android device");
  });

  it("labels a Mac", () => {
    expect(deviceLabel(MAC)).toBe("Mac");
  });

  it("labels Windows", () => {
    expect(deviceLabel(WINDOWS)).toBe("Windows");
  });

  it("labels Linux", () => {
    expect(deviceLabel(LINUX)).toBe("Linux");
  });

  it("falls back to Unknown device for undefined, null, or empty", () => {
    expect(deviceLabel(undefined)).toBe("Unknown device");
    expect(deviceLabel(null)).toBe("Unknown device");
    expect(deviceLabel("")).toBe("Unknown device");
  });

  it("falls back to Unknown device for an unrecognised UA", () => {
    expect(deviceLabel("SomeBot/1.0")).toBe("Unknown device");
  });
});
