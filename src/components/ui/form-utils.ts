import * as z from "zod";

import { translate } from "@/lib/i18n";

export const MIN_PASSWORD_LENGTH = 10;
/** Digits in a one-time code. Shared by `otpField` and the code inputs. */
export const OTP_LENGTH = 6;

/** Required, well-formed email. Shared across every auth form. */
export const emailField = z
  .string()
  .min(1, translate("auth.errors.email_required"))
  .email(translate("auth.errors.email_invalid"));

/** Required password meeting the minimum length. */
export const passwordField = z
  .string()
  .min(1, translate("auth.errors.password_required"))
  .min(MIN_PASSWORD_LENGTH, translate("auth.errors.password_too_short"));

/** 6-digit numeric one-time code. */
export const otpField = z
  .string()
  .length(OTP_LENGTH, translate("auth.otp.invalid_length"))
  .regex(/^\d+$/, translate("auth.otp.invalid_length"));

/**
 * Wraps a Zod schema for use as a TanStack Form validator. The form's validator
 * slot and the Zod schema type don't structurally align, so the cast bridges
 * the resolver adapter; it's isolated here so the single `any` lives in one
 * place rather than at every call site.
 */
export function zodValidator<T extends z.ZodTypeAny>(schema: T) {
  // biome-ignore lint/suspicious/noExplicitAny: TanStack Form's validator slot and the Zod schema type don't structurally align; the cast bridges the resolver adapter without affecting runtime validation.
  return schema as any;
}

// biome-ignore lint/suspicious/noExplicitAny: TanStack Form's FieldApi generic has 10+ type params; accepting `any` keeps this helper usable across every field without threading that signature.
export function getFieldError(field: any): string | undefined {
  if (!(field.state.meta.isTouched && field.state.meta.errors.length)) {
    return undefined;
  }

  const error = field.state.meta.errors[0];

  if (typeof error === "string") {
    return error;
  }

  // Zod errors carry the user-facing string on `message`.
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}
