import { relativeTime } from "../relative-time";

const NOW = new Date("2026-05-29T12:00:00Z");
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

describe("relativeTime", () => {
  it("returns 'Just now' under a minute", () => {
    expect(relativeTime(ago(30), NOW)).toBe("Just now");
  });

  it("buckets minutes", () => {
    expect(relativeTime(ago(5 * 60), NOW)).toBe("5 min ago");
  });

  it("buckets hours", () => {
    expect(relativeTime(ago(3 * 60 * 60), NOW)).toBe("3 hr ago");
  });

  it("buckets days", () => {
    expect(relativeTime(ago(2 * 24 * 60 * 60), NOW)).toBe("2 d ago");
  });

  it("clamps a future timestamp to 'Just now'", () => {
    expect(relativeTime(new Date(NOW.getTime() + 60_000), NOW)).toBe(
      "Just now"
    );
  });
});
