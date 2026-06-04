import Env from "env";

// Thrown on any non-2xx response. Carries the HTTP status and the parsed body
// (JSON when the response was JSON, otherwise raw text) so callers can branch
// on `status` or inspect the payload without re-reading the response.
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const ABSOLUTE_URL = /^https?:\/\//;

function resolveUrl(path: string): string {
  if (ABSOLUTE_URL.test(path)) {
    return path;
  }
  const base = Env.EXPO_PUBLIC_API_URL;
  if (!base) {
    throw new Error(
      "apiFetch called with a relative path but EXPO_PUBLIC_API_URL is not set"
    );
  }
  return new URL(path, base).toString();
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  return await response.text();
}

const DEFAULT_TIMEOUT_MS = 15_000;

export interface ApiRequestInit extends RequestInit {
  // Abort the request after this many ms (default 15s). Pass 0 to disable.
  timeoutMs?: number;
}

// Thin typed wrapper over `fetch`. Resolves relative paths against
// EXPO_PUBLIC_API_URL, sends/accepts JSON, aborts after `timeoutMs` so a hung
// request can't hang forever, throws `ApiError` on non-2xx, and returns the
// parsed JSON typed as `T`.
export async function apiFetch<T>(
  path: string,
  init?: ApiRequestInit
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init ?? {};

  const controller = new AbortController();
  const timer =
    timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  // Honor a caller-supplied signal alongside the timeout.
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const response = await fetch(resolveUrl(path), {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...rest.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, await parseBody(response));
    }

    return (await response.json()) as T;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
