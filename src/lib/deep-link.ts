/**
 * Allowlist for untrusted notification, custom-scheme, and universal-link
 * targets. It returns only app-internal paths; everything else resolves to null
 * before it can reach router.push.
 */
import Env from "env";

interface DeepLinkConfig {
  appScheme?: string;
  associatedDomain?: string;
}

const QUERY_OR_HASH = /[?#]/;
const DECODED_PATH_SEPARATOR = /[\\/]/;

function pathOnly(path: string): string {
  return path.split(QUERY_OR_HASH, 1)[0];
}

function segmentHasTraversal(segment: string): boolean {
  if (segment === "..") {
    return true;
  }
  try {
    return decodeURIComponent(segment)
      .split(DECODED_PATH_SEPARATOR)
      .includes("..");
  } catch {
    return false;
  }
}

function hasTraversalSegment(path: string): boolean {
  return pathOnly(path).split("/").some(segmentHasTraversal);
}

function rawPathFromUrlInput(input: string, authorityIsPath: boolean): string {
  const schemeEnd = input.indexOf(":");
  const rest = schemeEnd === -1 ? input : input.slice(schemeEnd + 1);
  const raw = pathOnly(rest);

  if (!raw.startsWith("//")) {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }

  const afterSlashes = raw.slice(2);
  if (authorityIsPath) {
    return afterSlashes.startsWith("/") ? afterSlashes : `/${afterSlashes}`;
  }

  const pathStart = afterSlashes.indexOf("/");
  return pathStart === -1 ? "/" : afterSlashes.slice(pathStart);
}

function asInternalPath(path: string): string | null {
  if (path !== path.trimStart()) {
    return null;
  }
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\")
  ) {
    return null;
  }
  if (hasTraversalSegment(path)) {
    return null;
  }
  return path;
}

function pathFromUrl(url: URL): string {
  const path = url.pathname || "/";
  const anchored = path.startsWith("/") ? path : `/${path}`;
  return `${anchored}${url.search}${url.hash}`;
}

function resolveCustomScheme(parsed: URL): string | null {
  const authority = parsed.host;
  const rest = pathFromUrl(parsed);
  const folded = authority ? `/${authority}${rest === "/" ? "" : rest}` : rest;
  return asInternalPath(folded);
}

function resolveUniversalLink(
  parsed: URL,
  associatedDomain: string | undefined
): string | null {
  const domain = associatedDomain;
  if (!domain) {
    return null;
  }
  let allowed: URL;
  try {
    allowed = new URL(domain);
  } catch {
    return null;
  }
  if (allowed.protocol !== "https:") {
    return null;
  }
  if (allowed.port !== "") {
    return null;
  }
  const allowedHost = allowed.host.toLowerCase();
  if (parsed.host.toLowerCase() !== allowedHost) {
    return null;
  }
  return asInternalPath(pathFromUrl(parsed));
}

export function resolveDeepLinkWithConfig(
  url: unknown,
  { appScheme, associatedDomain }: DeepLinkConfig
): string | null {
  if (typeof url !== "string") {
    return null;
  }

  // Bare internal path (no scheme/host): the notification-route case.
  if (url.startsWith("/")) {
    return asInternalPath(url);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // `protocol` is e.g. "https:" / "expoforge:"; drop the trailing colon.
  const scheme = parsed.protocol.slice(0, -1).toLowerCase();
  const normalizedAppScheme = appScheme?.toLowerCase();

  if (normalizedAppScheme && scheme === normalizedAppScheme) {
    if (hasTraversalSegment(rawPathFromUrlInput(url, true))) {
      return null;
    }
    return resolveCustomScheme(parsed);
  }
  if (scheme === "https") {
    if (hasTraversalSegment(rawPathFromUrlInput(url, false))) {
      return null;
    }
    return resolveUniversalLink(parsed, associatedDomain);
  }
  return null;
}

export function resolveDeepLink(url: unknown): string | null {
  return resolveDeepLinkWithConfig(url, {
    appScheme: Env.EXPO_PUBLIC_SCHEME,
    associatedDomain: Env.EXPO_PUBLIC_ASSOCIATED_DOMAIN,
  });
}
