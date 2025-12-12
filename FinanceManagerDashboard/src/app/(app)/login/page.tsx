"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { LoginSection, type LoginFormValues, useSession } from "@features/auth";
import { SECTION_PATHS } from "@features/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") ?? SECTION_PATHS.dashboard;
  const { signIn, pendingChallenge, cancelTwoFactorChallenge, isAuthenticated } = useSession();

  useEffect(() => {
    cancelTwoFactorChallenge();
  }, [cancelTwoFactorChallenge]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  const handleLogin = async (credentials: LoginFormValues) => {
    const result = await signIn(credentials, { redirectTo });

    if (result.status === "needs_two_factor") {
      router.push(`${SECTION_PATHS.twoFactor}?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    router.push(redirectTo);
  };

  const handleCreateAccount = () => {
    router.push(SECTION_PATHS.signup);
  };

  const handleForgotPassword = () => {
    router.push(SECTION_PATHS.forgotPassword);
  };

  return (
    <LoginSection
      onLogin={handleLogin}
      onCreateAccount={handleCreateAccount}
      onForgotPassword={handleForgotPassword}
      defaultEmail={pendingChallenge?.email}
    />
  );
}
