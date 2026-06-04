/**
 * Validator Utilities
 *
 * Function argument and return-type validators.
 * Schema-level field validators live in schema.ts.
 */

import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

/** Spread into a v.object() alongside the page shape. */
export const paginatedResponseFields = {
  continueCursor: v.string(),
  isDone: v.boolean(),
};

// ============================================================================
// User Profile Validators
// ============================================================================

/** Name changes go through Better Auth (authClient.updateUser) directly. */
export const userProfileUpdateFields = {
  bio: v.optional(v.string()),
};

/**
 * Public user profile returned by api.users.getUser and in listUsers pages.
 * Merges app-owned fields (bio, avatar storage resolved to URL) with Better
 * Auth identity fields (name, username).
 */
export const publicUserProfileValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  name: v.string(),
  username: v.union(v.string(), v.null()),
  avatarUrl: v.union(v.string(), v.null()),
  bio: v.optional(v.string()),
});

export const paginatedUsersValidator = v.object({
  page: v.array(publicUserProfileValidator),
  ...paginatedResponseFields,
});

// ============================================================================
// Mobile Validators
// ============================================================================

// Cross-platform device type. Push tokens and other per-device records are
// keyed on this; matches the `deviceType` union in schema.ts.
export const deviceTypeValidator = literals("ios", "android");

// ============================================================================
// Validation Helpers
// ============================================================================

const BIO_MAX_LENGTH = 500;

export function validateBio(bio: string): { valid: boolean; error?: string } {
  if (bio.length > BIO_MAX_LENGTH) {
    return {
      valid: false,
      error: `Bio must be ${BIO_MAX_LENGTH} characters or less`,
    };
  }
  return { valid: true };
}
