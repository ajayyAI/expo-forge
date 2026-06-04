import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as z from "zod";

import { Button, Input, PressableScale, Text, View } from "@/components/ui";
import {
  emailField,
  getFieldError,
  passwordField,
  zodValidator,
} from "@/components/ui/form-utils";
import { notify } from "@/lib/haptics";
import { translate } from "@/lib/i18n";

import { AuthHeader } from "./auth-header";

const schema = z.object({
  name: z.string().min(1, translate("auth.errors.name_required")),
  email: emailField,
  password: passwordField,
});

export type SignUpCredentials = z.infer<typeof schema>;

/** An inline error message to display, or nothing on success. */
type SubmitResult = string | undefined | Promise<string | undefined>;

export interface SignUpFormProps {
  /** Create the account. Return an error message to show it inline. */
  onSubmit: (data: SignUpCredentials) => SubmitResult;
  onSignIn: () => void;
}

export function SignUpForm({ onSubmit, onSignIn }: SignUpFormProps) {
  const [formError, setFormError] = useState<string | undefined>();

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: {
      onChange: zodValidator(schema),
    },
    onSubmit: async ({ value }) => {
      setFormError(undefined);
      const message = await onSubmit(value);
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
          subtitle="auth.sign_up.subtitle"
          title="auth.sign_up.title"
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
              autoCapitalize="words"
              autoComplete="name"
              error={getFieldError(field)}
              label={translate("auth.name_label")}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              testID="name-input"
              value={field.state.value}
            />
          )}
          name="name"
        />

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

        <form.Field
          children={(field) => (
            <Input
              autoComplete="new-password"
              error={getFieldError(field)}
              label={translate("auth.password_label")}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              secureTextEntry={true}
              testID="password-input"
              value={field.state.value}
            />
          )}
          name="password"
        />

        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button
              label={translate("auth.sign_up.submit")}
              loading={isSubmitting}
              onPress={form.handleSubmit}
              testID="sign-up-button"
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
          <Text className="text-neutral-500">
            {translate("auth.have_account")}{" "}
            <Text className="font-semibold underline">
              {translate("auth.sign_in_link")}
            </Text>
          </Text>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}
