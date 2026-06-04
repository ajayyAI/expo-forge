import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { createElement } from "react";

import { ApiError } from "@/lib/api";

import { useExampleResource } from "../api";

jest.mock("env", () => ({
  __esModule: true,
  default: { EXPO_PUBLIC_API_URL: "https://api.example.com" },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

afterEach(() => mockFetch.mockReset());

describe("useExampleResource", () => {
  it("returns typed data on success", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, { id: "1", name: "Widget" })
    );

    const { result } = renderHook(() => useExampleResource("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "1", name: "Widget" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/example/1",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      })
    );
  });

  it("surfaces an ApiError on a non-2xx response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(404, { message: "missing" }));

    const { result } = renderHook(() => useExampleResource("404"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).body).toEqual({ message: "missing" });
  });
});
