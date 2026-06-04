import { useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";
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

const passwordSchema = z.object({
  email: emailField,
  password: passwordField,
});

const otpRequestSchema = z.object({ email: emailField });

export type PasswordCredentials = z.infer<typeof passwordSchema>;

/** An inline error message to display, or nothing on success. */
type SubmitResult = string | undefined | Promise<string | undefined>;

type Mode = "password" | "otp";

export interface LoginFormProps {
  /** Email + password sign-in. Return an error message to show it inline. */
  onPasswordSubmit: (data: PasswordCredentials) => SubmitResult;
  /** Request a passwordless code for `email`. Return an error to show inline. */
  onOtpRequest: (email: string) => SubmitResult;
  /** Whether email-OTP sign-in is offered (server-driven). */
  otpEnabled: boolean;
  /** Whether email + password is opted in (`EXPO_PUBLIC_PASSWORD_AUTH_ENABLED`). */
  passwordEnabled: boolean;
  onForgotPassword: () => void;
  onCreateAccount: () => void;
  /** Social sign-in buttons, rendered above the email form when present. */
  social?: ReactNode;
}

export function LoginForm({
  onPasswordSubmit,
  onOtpRequest,
  otpEnabled,
  passwordEnabled,
  onForgotPassword,
  onCreateAccount,
  social,
}: LoginFormProps) {
  const [mode, setMode] = useState<Mode>(otpEnabled ? "otp" : "password");
  const [formError, setFormError] = useState<string | undefined>();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onChange: zodValidator(
        mode === "password" ? passwordSchema : otpRequestSchema
      ),
    },
    onSubmit: async ({ value }) => {
      setFormError(undefined);
      const message =
        mode === "password"
          ? await onPasswordSubmit(value)
          : await onOtpRequest(value.email);
      if (message) {
        notify("error");
        setFormError(message);
      } else {
        notify("success");
      }
    },
  });

  const toggleMode = () => {
    setFormError(undefined);
    setMode((current) => (current === "password" ? "otp" : "password"));
  };

  const isPassword = mode === "password";
  const canEmailAuth = otpEnabled || passwordEnabled;
  const canToggleMode = otpEnabled && passwordEnabled;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={10}
      style={{ flex: 1 }}
    >
      <View className="w-full max-w-sm flex-1 justify-center self-center px-6">
        <AuthHeader
          subtitle="auth.sign_in.subtitle"
          title="auth.sign_in.title"
          titleTestID="form-title"
        />

        {social}

        {canEmailAuth ? (
          <>
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

            {isPassword ? (
              <form.Field
                children={(field) => (
                  <Input
                    autoComplete="current-password"
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
            ) : null}

            <form.Subscribe selector={(state) => [state.isSubmitting]}>
              {([isSubmitting]) => (
                <Button
                  label={translate(
                    isPassword
                      ? "auth.sign_in.submit"
                      : "auth.sign_in.send_code"
                  )}
                  loading={isSubmitting}
                  onPress={form.handleSubmit}
                  testID="sign-in-button"
                />
              )}
            </form.Subscribe>

            {isPassword ? (
              <ForgotPasswordLink onPress={onForgotPassword} />
            ) : null}
            {canToggleMode ? (
              <ModeToggleLink mode={mode} onToggle={toggleMode} />
            ) : null}
          </>
        ) : null}

        {passwordEnabled ? (
          <CreateAccountLink onPress={onCreateAccount} />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function ForgotPasswordLink({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      className="mt-3 self-center"
      haptic={false}
      onPress={onPress}
      testID="forgot-password-link"
    >
      <Text className="text-neutral-500 underline">
        {translate("auth.forgot_password")}
      </Text>
    </PressableScale>
  );
}

function ModeToggleLink({
  mode,
  onToggle,
}: {
  mode: Mode;
  onToggle: () => void;
}) {
  const label =
    mode === "password" ? "auth.sign_in.use_code" : "auth.sign_in.use_password";
  return (
    <PressableScale
      accessibilityRole="button"
      className="mt-4 self-center"
      haptic={false}
      onPress={onToggle}
      testID="toggle-auth-mode"
    >
      <Text className="font-medium text-neutral-500 underline">
        {translate(label)}
      </Text>
    </PressableScale>
  );
}

function CreateAccountLink({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      className="mt-6 self-center"
      haptic={false}
      onPress={onPress}
      testID="create-account-link"
    >
      <Text className="text-neutral-500">
        {translate("auth.no_account")}{" "}
        <Text className="font-semibold underline">
          {translate("auth.create_account")}
        </Text>
      </Text>
    </PressableScale>
  );
}
