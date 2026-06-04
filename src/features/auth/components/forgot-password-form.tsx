import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as z from "zod";

import { Button, Input, PressableScale, Text, View } from "@/components/ui";
import {
  emailField,
  getFieldError,
  zodValidator,
} from "@/components/ui/form-utils";
import { notify } from "@/lib/haptics";
import { translate } from "@/lib/i18n";

import { AuthHeader } from "./auth-header";

const schema = z.object({ email: emailField });

export type ForgotPasswordValues = z.infer<typeof schema>;

/** An inline error message to display, or nothing on success. */
type SubmitResult = string | undefined | Promise<string | undefined>;

export interface ForgotPasswordFormProps {
  /** Request a reset code for `email`. Return an error to show inline. */
  onSubmit: (email: string) => SubmitResult;
  onSignIn: () => void;
}

export function ForgotPasswordForm({
  onSubmit,
  onSignIn,
}: ForgotPasswordFormProps) {
  const [formError, setFormError] = useState<string | undefined>();

  const form = useForm({
    defaultValues: { email: "" },
    validators: {
      onChange: zodValidator(schema),
    },
    onSubmit: async ({ value }) => {
      setFormError(undefined);
      const message = await onSubmit(value.email);
      if (message) {
        notify("error");
        setFormError(message);
      } else {
        notify("success");
      }
    },
  });

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={10}
      style={{ flex: 1 }}
    >
      <View className="w-full max-w-sm flex-1 justify-center self-center px-6">
        <AuthHeader
          subtitle="auth.forgot.subtitle"
          title="auth.forgot.title"
          titleTestID="form-title"
        />

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
              autoCapitalize="none"
              autoComplete="email"
              error={getFieldError(field)}
              keyboardType="email-address"
              label={translate("auth.email_label")}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              testID="email-input"
              value={field.state.value}
            />
          )}
          name="email"
        />

        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button
              label={translate("auth.forgot.submit")}
              loading={isSubmitting}
              onPress={form.handleSubmit}
              testID="forgot-password-button"
            />
          )}
        </form.Subscribe>

        <PressableScale
          accessibilityRole="button"
          className="mt-6 self-center"
          haptic={false}
          onPress={onSignIn}
          testID="sign-in-link"
        >
          <Text className="text-neutral-500 underline">
            {translate("auth.sign_in_link")}
          </Text>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}
