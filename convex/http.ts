import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes lazily so Better Auth is not initialized at
// module load. Reduces http.ts memory footprint during `convex deploy`.
authComponent.registerRoutesLazy(http, createAuth);

// Apple App Site Association for iOS universal links. The body stays
// deterministic for stable ETags; missing Apple identifiers fail closed.
http.route({
  path: "/.well-known/apple-app-site-association",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const teamId = process.env.APPLE_TEAM_ID;
    const bundleId = process.env.APP_BUNDLE_ID;
    if (!(teamId && bundleId)) {
      return new Response(
        JSON.stringify({
          error: "APPLE_TEAM_ID and APP_BUNDLE_ID must be set",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = JSON.stringify({
      applinks: {
        details: [
          {
            appIDs: [`${teamId}.${bundleId}`],
            components: [{ "/": "/*" }],
          },
        ],
      },
    });
    const etag = `"${await sha256Hex(body)}"`;
    const cacheControl = "public, max-age=3600, must-revalidate";

    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": cacheControl },
      });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cacheControl,
        ETag: etag,
      },
    });
  }),
});

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default http;
