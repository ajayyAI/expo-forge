import { DEFAULT_AVATAR, resolveAvatarSource } from "../avatar";

describe("resolveAvatarSource", () => {
  it("prefers the server-resolved avatarUrl", () => {
    expect(
      resolveAvatarSource({
        avatarUrl: "https://cdn/upload.jpg",
        image: "https://oauth/pic.jpg",
      })
    ).toEqual({ uri: "https://cdn/upload.jpg" });
  });

  it("falls back to the OAuth image when avatarUrl is null", () => {
    expect(
      resolveAvatarSource({ avatarUrl: null, image: "https://oauth/pic.jpg" })
    ).toEqual({ uri: "https://oauth/pic.jpg" });
  });

  it("uses the bundled placeholder when no source is present", () => {
    expect(resolveAvatarSource({ avatarUrl: null, image: null })).toBe(
      DEFAULT_AVATAR
    );
    expect(resolveAvatarSource(null)).toBe(DEFAULT_AVATAR);
    expect(resolveAvatarSource(undefined)).toBe(DEFAULT_AVATAR);
  });
});
