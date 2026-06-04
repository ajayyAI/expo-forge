import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as z from "zod";

import { Button, Input, Text, View } from "@/components/ui";
import {
  getFieldError,
  OTP_LENGTH,
  otpField,
  passwordField,
  zodValidator,
} from "@/components/ui/form-utils";
import { translate } from "@/lib/i18n";

const schema = z
  .object({
    otp: otpField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: translate("auth.errors.password_mismatch"),
    path: ["confirmPassword"],
  });

export type ResetPasswordValues = z.infer<typeof schema>;

/** An inline error message to display, or nothing on success. */
type SubmitResult = string | undefined | Promise<string | undefined>;

export interface ResetPasswordFormProps {
  /** Address the code was sent to; shown for context. */
  email: string;
  /** Reset with the entered code + new password. Return an error to show it. */
  onSubmit: (values: { otp: string; password: string }) => SubmitResult;
  /** Request a fresh code. Return an error to show it inline. */
  onResend: () => SubmitResult;
}

// The OTP code is a field on this form rather than the standalone
// OtpVerification component: code and new password must validate and submit
// together, which the single-purpose component (own submit button) can't do.
export function ResetPasswordForm({
  email,
  onSubmit,
  onResend,
}: ResetPasswordFormProps) {
  const [formError, setFormError] = useState<string | undefined>();

  const form = useForm({
    defaultValues: { otp: "", password: "", confirmPassword: "" },
    validators: {
      onChange: zodValidator(schema),
    },
    onSubmit: async ({ value }) => {
      setFormError(undefined);
      const message = await onSubmit({
        otp: value.otp,
        password: value.password,
      });
      if (message) setFormError(message);
    },
  });

  const resend = async () => {
    setFormError(undefined);
    const message = await onResend();
    if (message) setFormError(message);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={10}
      style={{ flex: 1 }}
    >
      <View className="flex-1 justify-center p-4">
        <View className="items-center justify-center">
          <Text
            className="pb-2 text-center font-bold text-3xl"
            testID="form-title"
          >
            {translate("auth.reset.title")}
          </Text>
          <Text className="mb-6 max-w-xs text-center text-neutral-500">
            {translate("auth.reset.subtitle", { email })}
          </Text>
        </View>

        {formError ? (
          <Text
            className="mb-2 text-center text-danger-600"
            testID="form-error"
          >
            {formError}
          </Text>
        ) : null}

        <form.Field
          children={(field) => (
            <Input
              autoComplete="one-time-code"
              error={getFieldError(field)}
              keyboardType="number-pad"
              label={translate("auth.otp.code_label")}
              maxLength={OTP_LENGTH}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              testID="otp-input"
              textContentType="oneTimeCode"
              value={field.state.value}
            />
          )}
          name="otp"
        />

        <form.Field
          children={(field) => (
            <Input
              autoComplete="new-password"
              error={getFieldError(field)}
              label={translate("auth.reset.new_password_label")}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              secureTextEntry={true}
              testID="password-input"
              value={field.state.value}
            />
          )}
          name="password"
        />

        <form.Field
          children={(field) => (
            <Input
              autoComplete="new-password"
              error={getFieldError(field)}
              label={translate("auth.reset.confirm_password_label")}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              secureTextEntry={true}
              testID="confirm-password-input"
              value={field.state.value}
            />
          )}
          name="confirmPassword"
        />

        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button
              label={translate("auth.reset.submit")}
              loading={isSubmitting}
              onPress={form.handleSubmit}
              testID="reset-password-button"
            />
          )}
        </form.Subscribe>

        <Button
          label={translate("auth.otp.resend")}
          onPress={resend}
          testID="otp-resend-button"
          variant="ghost"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
