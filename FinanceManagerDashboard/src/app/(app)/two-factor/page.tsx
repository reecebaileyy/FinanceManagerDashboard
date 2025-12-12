"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  TwoFactorSection,
  type TwoFactorVerificationPayload,
  useSession,
} from "@features/auth";
import { SECTION_PATHS } from "@features/navigation";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function TwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") ?? SECTION_PATHS.dashboard;
  const { pendingChallenge, completeTwoFactor, cancelTwoFactorChallenge } = useSession();

  useEffect(() => {
    if (!pendingChallenge) {
      router.replace(SECTION_PATHS.login);
    }
  }, [pendingChallenge, router]);

  const handleVerify = async (payload: TwoFactorVerificationPayload) => {
    if (!pendingChallenge) {
      throw new Error("Your verification session expired. Please log in again.");
    }

    if (payload.method === "code" && payload.code === "000000") {
      throw new Error("000000 is not a valid code. Please use the latest code from your device.");
    }

    const submission =
      payload.method === "code"
        ? ({ mode: "code", code: payload.code } as const)
        : ({ mode: "backup", backupCode: payload.backupCode } as const);

    await wait(200);
    await completeTwoFactor(submission, { redirectTo });
    router.push(redirectTo);
  };

  const handleResend = async () => {
    await wait(400);
  };

  const handleCancel = () => {
    cancelTwoFactorChallenge();
    router.push(SECTION_PATHS.login);
  };

  return (
    <TwoFactorSection
      username={pendingChallenge?.displayName}
      method={pendingChallenge?.method}
      destination={pendingChallenge?.destination ?? pendingChallenge?.email}
      backupCodesRemaining={pendingChallenge ? 5 : undefined}
      onVerify={handleVerify}
      onResendCode={handleResend}
      onCancel={handleCancel}
    />
  );
}
