import { useRouter } from "expo-router";

import { FocusAwareStatusBar, ScrollView } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { translate } from "@/lib/i18n";

import { ForgotPasswordForm } from "./components/forgot-password-form";

export function ForgotPasswordScreen() {
  const router = useRouter();

  const onSubmit = async (email: string) => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "forget-password",
    });
    if (error) return error.message ?? translate("auth.errors.otp_send_failed");
    router.push({ pathname: "/reset-password", params: { email } });
  };

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        contentContainerClassName="flex-grow justify-center"
        keyboardDismissMode="interactive"
      >
        <ForgotPasswordForm
          onSignIn={() => router.replace("/login")}
          onSubmit={onSubmit}
        />
      </ScrollView>
    </>
  );
}
