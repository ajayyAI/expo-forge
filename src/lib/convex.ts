import {
  ConvexReactClient,
  useAction as useActionBase,
  useConvexAuth as useConvexAuthBase,
  useMutation as useMutationBase,
  useQuery as useQueryBase,
} from "convex/react";

import { BACKEND_ENABLED, CONVEX_URL } from "./backend-config";

// Expo inlines `EXPO_PUBLIC_*` at build time, so this is a static decision per
// bundle, not a runtime toggle.
export { BACKEND_ENABLED, CONVEX_URL };

/** The app's single Convex client, or `null` when no backend is configured. */
export const convexClient = BACKEND_ENABLED
  ? new ConvexReactClient(CONVEX_URL as string, {
      unsavedChangesWarning: false,
    })
  : null;

// Without a mounted provider the real hooks throw for lack of a client. These
// disabled variants return the same shapes consumers already handle for the
// loading / signed-out state, so every Convex call site degrades cleanly when
// the backend is excised. Bound once at module load, never swapped, so the
// rules of hooks hold.
const noopQuery = () => undefined;
const noopMutation = () => () =>
  Promise.reject(
    new Error(
      "Convex auth backend is not configured: set valid EXPO_PUBLIC_CONVEX_URL and EXPO_PUBLIC_CONVEX_SITE_URL."
    )
  );
const noopConvexAuth = () => ({ isLoading: false, isAuthenticated: false });

export const useQuery = (
  BACKEND_ENABLED ? useQueryBase : noopQuery
) as typeof useQueryBase;

export const useMutation = (
  BACKEND_ENABLED ? useMutationBase : noopMutation
) as typeof useMutationBase;

export const useAction = (
  BACKEND_ENABLED ? useActionBase : noopMutation
) as typeof useActionBase;

export const useConvexAuth = (
  BACKEND_ENABLED ? useConvexAuthBase : noopConvexAuth
) as typeof useConvexAuthBase;
