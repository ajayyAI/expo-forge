import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

import {
  Button,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { translate } from "@/lib/i18n";

import { ResetPasswordForm } from "./components/reset-password-form";

export function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [done, setDone] = useState(false);

  // Reached without the email the OTP was sent to: nothing to reset, so send
  // the user back to request a fresh code rather than render "…sent to undefined".
  if (!email) {
    return <Redirect href="/forgot-password" />;
  }

  const onSubmit = async ({
    otp,
    password,
  }: {
    otp: string;
    password: string;
  }) => {
    const { error } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password,
    });
    if (error) return error.message ?? translate("auth.errors.reset_failed");
    setDone(true);
  };

  const onResend = async () => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "forget-password",
    });
    if (error) return error.message ?? translate("auth.errors.otp_send_failed");
  };

  if (done) {
    return (
      <>
        <FocusAwareStatusBar />
        <View className="flex-1 items-center justify-center p-4">
          <Text
            className="mb-6 max-w-xs text-center text-neutral-500"
            testID="reset-success"
          >
            {translate("auth.reset.success")}
          </Text>
          <Button
            label={translate("auth.sign_in_link")}
            onPress={() => router.replace("/login")}
            testID="reset-success-sign-in"
          />
        </View>
      </>
    );
  }

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView contentContainerClassName="flex-grow justify-center">
        <ResetPasswordForm
          email={email}
          onResend={onResend}
          onSubmit={onSubmit}
        />
      </ScrollView>
    </>
  );
}
