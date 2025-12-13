"use client";

import { useRouter } from "next/navigation";

import {
  ForgotPasswordSection,
  type ForgotPasswordFormValues,
} from "@features/auth";
import { SECTION_PATHS } from "@features/navigation";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleSubmit = async (_values: ForgotPasswordFormValues) => {
    await wait(300);
  };

  const handleBackToLogin = () => {
    router.push(SECTION_PATHS.login);
  };

  return <ForgotPasswordSection onSubmit={handleSubmit} onBackToLogin={handleBackToLogin} />;
}
