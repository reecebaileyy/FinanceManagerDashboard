"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SignupSection, type SignupFormValues, useSession } from "@features/auth";
import { SECTION_PATHS } from "@features/navigation";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") ?? SECTION_PATHS.dashboard;
  const { register, cancelTwoFactorChallenge, isAuthenticated } = useSession();

  useEffect(() => {
    cancelTwoFactorChallenge();
  }, [cancelTwoFactorChallenge]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  const handleCreateAccount = async (values: SignupFormValues) => {
    const result = await register(values, { redirectTo });

    if (result.status === "needs_two_factor") {
      router.push(`${SECTION_PATHS.twoFactor}?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    router.push(redirectTo);
  };

  const handleCancel = () => {
    cancelTwoFactorChallenge();
    router.push(SECTION_PATHS.home);
  };

  return <SignupSection onCreateAccount={handleCreateAccount} onCancel={handleCancel} />;
}
