import { useForm } from "@tanstack/react-form";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as z from "zod";

import { Button, Input, Text, View } from "@/components/ui";
import {
  getFieldError,
  OTP_LENGTH,
  otpField,
  zodValidator,
} from "@/components/ui/form-utils";
import { translate } from "@/lib/i18n";

const schema = z.object({ otp: otpField });

type FormType = z.infer<typeof schema>;

export interface OtpVerificationProps {
  /** The address the code was sent to; shown to the user for context. */
  email: string;
  /** Resolves the entered code against the server. Surface any failure via the
   * `error` prop the parent owns. */
  onVerify: (otp: string) => Promise<void> | void;
  /** Requests a fresh code. */
  onResend: () => Promise<void> | void;
  /** Inline error from the parent (e.g. a failed verify the parent owns). */
  error?: string;
}

/**
 * Shared 6-digit code entry. Reused by passwordless sign-in, sign-up email
 * verification, and password reset, so verify/resend are injected by the
 * caller rather than bound to one flow.
 */
export function OtpVerification({
  email,
  onVerify,
  onResend,
  error,
}: OtpVerificationProps) {
  const form = useForm({
    defaultValues: { otp: "" },
    validators: {
      onChange: zodValidator(schema),
    },
    onSubmit: async ({ value }: { value: FormType }) => {
      await onVerify(value.otp);
    },
  });

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
            testID="otp-title"
          >
            {translate("auth.otp.title")}
          </Text>
          <Text className="mb-6 max-w-xs text-center text-neutral-500">
            {translate("auth.otp.subtitle", { email })}
          </Text>
        </View>

        {error ? (
          <Text className="mb-2 text-center text-danger-600" testID="otp-error">
            {error}
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

        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button
              label={translate("auth.otp.verify")}
              loading={isSubmitting}
              onPress={form.handleSubmit}
              testID="otp-verify-button"
            />
          )}
        </form.Subscribe>

        <Button
          label={translate("auth.otp.resend")}
          onPress={() => onResend()}
          testID="otp-resend-button"
          variant="ghost"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
