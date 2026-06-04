/**
 * Structured Errors
 *
 * Error factories emit ConvexError with a stable code so clients can
 * branch on `error.data.code` without parsing messages.
 */

import { ConvexError } from "convex/values";

export const ErrorCode = {
  UNAUTHENTICATED: "AUTH_1001",
  ACCOUNT_DELETION_PENDING: "AUTH_1002",
  VALIDATION_ERROR: "VAL_3001",
} as const;

type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

// A `type` alias (not `interface`) is required: ConvexError's payload must be
// assignable to Convex's `Value` ({ [key: string]: Value }), and only a type
// alias carries the implicit index signature that satisfies that constraint.
// biome-ignore lint/style/useConsistentTypeDefinitions: see above — interface would break ConvexError typing.
type AppErrorData = {
  code: ErrorCodeValue;
  message: string;
  field?: string;
};

function createError(
  code: ErrorCodeValue,
  message: string,
  options?: { field?: string }
) {
  return new ConvexError({ code, message, ...options } as AppErrorData);
}

export function authenticationRequired(message = "Authentication required") {
  return createError(ErrorCode.UNAUTHENTICATED, message);
}

export function deletionPending(
  message = "Account is pending deletion; restore it before continuing."
) {
  return createError(ErrorCode.ACCOUNT_DELETION_PENDING, message);
}

export function validationError(message: string, field?: string) {
  return createError(ErrorCode.VALIDATION_ERROR, message, { field });
}
