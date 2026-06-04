/**
 * Custom Function Wrappers
 *
 * Authenticated query/mutation wrappers that inject the current user into
 * the context. Uses the centralized helpers from auth.ts to avoid duplication.
 */

import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";

import { mutation, query } from "./_generated/server";
import type { AuthUser } from "./auth";
import { requireAuthenticatedUser, safeGetAuthenticatedUser } from "./auth";
import { deletionPending } from "./errors";

export type { AuthUser };

export const authQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    user: await requireAuthenticatedUser(ctx),
  }))
);

/** For endpoints that work for both authenticated and anonymous users. */
export const optionalAuthQuery = customQuery(
  query,
  customCtx(async (ctx) => ({
    user: await safeGetAuthenticatedUser(ctx),
  }))
);

export const authMutation = customMutation(
  mutation,
  customCtx(async (ctx) => ({
    user: await requireAuthenticatedUser(ctx),
  }))
);

/**
 * Authenticated mutation that also rejects deletion-pending users. Normal
 * writes use this so a soft-deleted user (within the 30-day grace window) must
 * restore before mutating. deleteAccount/restoreAccount intentionally do NOT
 * use it — they are the lifecycle exits a deletion-pending user still needs.
 */
export const activeUserMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await requireAuthenticatedUser(ctx);
    if (user.deletedAt) {
      throw deletionPending();
    }
    return { user };
  })
);
