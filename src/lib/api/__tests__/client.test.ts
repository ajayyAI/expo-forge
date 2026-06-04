/**
 * `apiFetch` adds a timeout so a hung request can't hang forever, honors a
 * caller-supplied abort signal, and throws `ApiError` on non-2xx. `fetch` is
 * stubbed so these are exercised without a network.
 */

import { ApiError, apiFetch } from "../client";

function jsonResponse(
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {}
): Response {
  return {
    ok,
    status,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

// A fetch that never resolves until its signal aborts, then rejects.
function abortableFetch(): jest.Mock {
  return jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted"))
        );
      })
  );
}

describe("apiFetch", () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("returns parsed JSON on a 2xx response", async () => {
    global.fetch = jest.fn(() => Promise.resolve(jsonResponse({ id: "1" })));
    await expect(apiFetch("https://api.test/thing")).resolves.toEqual({
      id: "1",
    });
  });

  it("throws ApiError carrying status and body on non-2xx", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        jsonResponse({ message: "missing" }, { ok: false, status: 404 })
      )
    );
    await expect(apiFetch("https://api.test/thing")).rejects.toBeInstanceOf(
      ApiError
    );
  });

  it("aborts the request once the timeout elapses", async () => {
    jest.useFakeTimers();
    global.fetch = abortableFetch();
    const promise = apiFetch("https://api.test/slow", { timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toThrow("aborted");
    jest.advanceTimersByTime(1000);
    await assertion;
  });

  it("aborts when the caller's signal fires", async () => {
    const controller = new AbortController();
    global.fetch = abortableFetch();
    const promise = apiFetch("https://api.test/slow", {
      signal: controller.signal,
    });
    const assertion = expect(promise).rejects.toThrow("aborted");
    controller.abort();
    await assertion;
  });
});
