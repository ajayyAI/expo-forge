import { useRouter } from "expo-router";
import { useState } from "react";

import { FocusAwareStatusBar, ScrollView } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { translate } from "@/lib/i18n";

import { OtpVerification } from "./components/otp-verification";
import { type SignUpCredentials, SignUpForm } from "./components/sign-up-form";

type Step = { name: "form" } | { name: "verify"; email: string };

export function SignUpScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "form" });
  const [otpError, setOtpError] = useState<string | undefined>();

  const onSubmit = async (data: SignUpCredentials) => {
    const { data: result, error } = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });
    if (error) return error.message ?? translate("auth.errors.sign_up_failed");
    // Verification off: autoSignIn returns a live session, so go straight in.
    // Verification on: no token is returned and an OTP was emailed, so step to
    // the code screen.
    if (result?.token) {
      router.replace("/");
      return;
    }
    setOtpError(undefined);
    setStep({ name: "verify", email: data.email });
  };

  if (step.name === "verify") {
    const verify = async (otp: string) => {
      setOtpError(undefined);
      const { error } = await authClient.emailOtp.verifyEmail({
        email: step.email,
        otp,
      });
      if (error) {
        setOtpError(error.message ?? translate("auth.errors.otp_invalid"));
        return;
      }
      // autoSignInAfterVerification creates the session inline.
      router.replace("/");
    };

    const resend = async () => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: step.email,
        type: "email-verification",
      });
      if (error) {
        setOtpError(error.message ?? translate("auth.errors.otp_send_failed"));
      }
    };

    return (
      <>
        <FocusAwareStatusBar />
        <OtpVerification
          email={step.email}
          error={otpError}
          onResend={resend}
          onVerify={verify}
        />
      </>
    );
  }

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        contentContainerClassName="flex-grow justify-center"
        keyboardDismissMode="interactive"
      >
        <SignUpForm
          onSignIn={() => router.replace("/login")}
          onSubmit={onSubmit}
        />
      </ScrollView>
    </>
  );
}
