/**
 * Pins the query-client policy: 4xx aren't retried (except 408/429), failures
 * report to Sentry, and only mutations toast (queries stay silent so screens
 * own their inline error UI). `meta.suppressErrorToast` opts a mutation out.
 */

jest.mock("@/components/ui/utils", () => ({ showErrorMessage: jest.fn() }));
jest.mock("@/lib/errors", () => ({ reportError: jest.fn() }));
jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

import { showErrorMessage } from "@/components/ui/utils";
import { reportError } from "@/lib/errors";
import { ApiError } from "../client";
import { queryClient } from "../provider";

type RetryFn = (failureCount: number, error: unknown) => boolean;
type ErrorHandler = (...args: unknown[]) => unknown;

const queryOnError = queryClient.getQueryCache().config
  .onError as unknown as ErrorHandler;
const mutationOnError = queryClient.getMutationCache().config
  .onError as unknown as ErrorHandler;

function mutation(meta?: Record<string, unknown>): unknown {
  return { options: { meta } };
}

afterEach(() => jest.clearAllMocks());

describe("retry policy", () => {
  const retry = queryClient.getDefaultOptions().queries?.retry as RetryFn;

  it("does not retry client (4xx) errors", () => {
    expect(retry(0, new ApiError(404, {}))).toBe(false);
    expect(retry(0, new ApiError(401, {}))).toBe(false);
  });

  it("retries timeouts (408) and rate limits (429)", () => {
    expect(retry(0, new ApiError(408, {}))).toBe(true);
    expect(retry(0, new ApiError(429, {}))).toBe(true);
  });

  it("retries server errors and network failures up to twice", () => {
    expect(retry(0, new ApiError(500, {}))).toBe(true);
    expect(retry(1, new Error("network"))).toBe(true);
    expect(retry(2, new Error("network"))).toBe(false);
  });
});

describe("error surfacing", () => {
  it("reports query failures without a toast", () => {
    queryOnError(new Error("boom"), {});
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(showErrorMessage).not.toHaveBeenCalled();
  });

  it("reports mutation failures and toasts by default", () => {
    mutationOnError(new Error("boom"), undefined, undefined, mutation());
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(showErrorMessage).toHaveBeenCalledTimes(1);
  });

  it("suppresses the toast when meta.suppressErrorToast is set", () => {
    mutationOnError(
      new Error("boom"),
      undefined,
      undefined,
      mutation({ suppressErrorToast: true })
    );
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(showErrorMessage).not.toHaveBeenCalled();
  });
});
