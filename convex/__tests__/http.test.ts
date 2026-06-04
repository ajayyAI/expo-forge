import http from "../http";

const AASA_PATH = "/.well-known/apple-app-site-association";
const CACHE_CONTROL = "public, max-age=3600, must-revalidate";
const ETAG_RE = /^"[a-f0-9]{64}"$/;

interface InvokableHttpAction {
  invokeHttpAction: (request: Request) => Promise<Response>;
}

async function requestAasa(headers?: HeadersInit): Promise<Response> {
  const match = http.lookup(AASA_PATH, "GET");
  if (!match) {
    throw new Error("AASA route is not registered");
  }

  const [handler] = match;
  const invokable = handler as typeof handler & InvokableHttpAction;
  return await invokable.invokeHttpAction(
    new Request(`https://links.example.com${AASA_PATH}`, { headers })
  );
}

function restoreEnv(name: "APPLE_TEAM_ID" | "APP_BUNDLE_ID", value?: string) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe("apple-app-site-association", () => {
  const originalTeamId = process.env.APPLE_TEAM_ID;
  const originalBundleId = process.env.APP_BUNDLE_ID;

  afterEach(() => {
    restoreEnv("APPLE_TEAM_ID", originalTeamId);
    restoreEnv("APP_BUNDLE_ID", originalBundleId);
  });

  test("serves deterministic AASA v2 components with cache headers", async () => {
    process.env.APPLE_TEAM_ID = "TEAM123";
    process.env.APP_BUNDLE_ID = "com.expoforge";

    const response = await requestAasa();
    const body = await response.text();
    const expectedBody = JSON.stringify({
      applinks: {
        details: [
          {
            appIDs: ["TEAM123.com.expoforge"],
            components: [{ "/": "/*" }],
          },
        ],
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
    expect(response.headers.get("ETag")).toMatch(ETAG_RE);
    expect(body).toBe(expectedBody);
  });

  test("returns 304 when If-None-Match matches the deterministic ETag", async () => {
    process.env.APPLE_TEAM_ID = "TEAM123";
    process.env.APP_BUNDLE_ID = "com.expoforge";

    const first = await requestAasa();
    const etag = first.headers.get("ETag");
    if (!etag) {
      throw new Error("AASA response did not include an ETag");
    }

    const second = await requestAasa({ "If-None-Match": etag });

    expect(second.status).toBe(304);
    expect(second.headers.get("ETag")).toBe(etag);
    expect(second.headers.get("Cache-Control")).toBe(CACHE_CONTROL);
    expect(await second.text()).toBe("");
  });

  test("returns 503 when Apple identifiers are not configured", async () => {
    delete process.env.APPLE_TEAM_ID;
    process.env.APP_BUNDLE_ID = "com.expoforge";

    const response = await requestAasa();

    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({
      error: "APPLE_TEAM_ID and APP_BUNDLE_ID must be set",
    });
  });
});
