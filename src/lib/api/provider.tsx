import {
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { addNetworkStateListener } from "expo-network";
import type * as React from "react";

import { showErrorMessage } from "@/components/ui/utils";
import { reportError } from "@/lib/errors";
import { ApiError } from "./client";

interface AppMutationMeta extends Record<string, unknown> {
  suppressErrorToast?: boolean;
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: AppMutationMeta;
  }
}

// Drive React Query's online state from device connectivity.
onlineManager.setEventListener((setOnline) => {
  const subscription = addNetworkStateListener(({ isConnected }) => {
    setOnline(Boolean(isConnected));
  });
  return () => subscription.remove();
});

// 4xx won't fix themselves, so don't retry them — except 408/429.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  ) {
    return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 60_000,
    },
    mutations: {
      retry: shouldRetry,
    },
  },
  // Queries report silently (screens own their inline error UI); mutations also
  // toast unless `meta.suppressErrorToast` is set.
  queryCache: new QueryCache({
    onError: (error) => reportError(error),
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      reportError(error);
      if (!mutation.options.meta?.suppressErrorToast) {
        showErrorMessage();
      }
    },
  }),
});

export function APIProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
