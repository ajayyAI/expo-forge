import { api } from "convex/_generated/api";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { FocusAwareStatusBar, ScrollView, Text } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@/lib/convex";
import { translate } from "@/lib/i18n";

import {
  getAppStoreComplianceWarning,
  isPasswordAuthEnabled,
} from "./capabilities";
import { LoginForm, type PasswordCredentials } from "./components/login-form";
import { OtpVerification } from "./components/otp-verification";
import { SocialSignInButtons } from "./components/social-sign-in-buttons";

type Step = { name: "form" } | { name: "otp"; email: string };

let didWarnCompliance = false;

export function LoginScreen() {
  const router = useRouter();
  const enabled = useQuery(api.auth.getEnabledProviders);
  const otpEnabled = enabled?.emailFeatures ?? false;
  const passwordEnabled = isPasswordAuthEnabled();

  useEffect(() => {
    if (__DEV__ && !didWarnCompliance) {
      const warning = getAppStoreComplianceWarning();
      if (warning) {
        didWarnCompliance = true;
        console.warn(`[auth] ${warning}`);
      }
    }
  }, []);

  const [step, setStep] = useState<Step>({ name: "form" });
  const [otpError, setOtpError] = useState<string | undefined>();
  const [socialError, setSocialError] = useState<string | undefined>();

  const onPasswordSubmit = async (data: PasswordCredentials) => {
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });
    if (error) return error.message ?? translate("auth.errors.sign_in_failed");
    router.replace("/");
  };

  const onOtpRequest = async (email: string) => {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    if (error) return error.message ?? translate("auth.errors.otp_send_failed");
    setOtpError(undefined);
    setStep({ name: "otp", email });
  };

  if (step.name === "otp") {
    const verify = async (otp: string) => {
      setOtpError(undefined);
      const { error } = await authClient.signIn.emailOtp({
        email: step.email,
        otp,
      });
      if (error) {
        setOtpError(error.message ?? translate("auth.errors.otp_invalid"));
        return;
      }
      router.replace("/");
    };

    const resend = async () => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: step.email,
        type: "sign-in",
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
        <LoginForm
          onCreateAccount={() => router.push("/sign-up")}
          onForgotPassword={() => router.push("/forgot-password")}
          onOtpRequest={onOtpRequest}
          onPasswordSubmit={onPasswordSubmit}
          otpEnabled={otpEnabled}
          passwordEnabled={passwordEnabled}
          social={
            <>
              {socialError ? (
                <Text
                  className="mb-2 text-center text-danger-600"
                  testID="social-error"
                >
                  {socialError}
                </Text>
              ) : null}
              <SocialSignInButtons enabled={enabled} onError={setSocialError} />
            </>
          }
        />
      </ScrollView>
    </>
  );
}
