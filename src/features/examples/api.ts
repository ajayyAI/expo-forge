/**
 * Reference example for the project's REST data layer (src/lib/api).
 *
 * This is a pattern to copy, not a real feature: a vanilla TanStack `useQuery`
 * hook backed by the typed `apiFetch` client. Replace `ExampleResource`, the
 * path, and the query key with your real endpoint, then colocate the hook in
 * the consuming feature's own `api.ts`. The provider is already mounted in
 * src/app/_layout.tsx; the hook is inert until EXPO_PUBLIC_API_URL is set.
 */
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export interface ExampleResource {
  id: string;
  name: string;
}

export function useExampleResource(id: string) {
  return useQuery({
    queryKey: ["example", id],
    queryFn: () => apiFetch<ExampleResource>(`/example/${id}`),
  });
}
