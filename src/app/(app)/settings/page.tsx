"use client";

import { useRouter } from "next/navigation";

import { SECTION_PATHS } from "@features/navigation";
import { SettingsSection } from "@features/settings";

export default function SettingsPage() {
  const router = useRouter();

  const handleBackToDashboard = () => {
    router.push(SECTION_PATHS.dashboard);
  };

  return <SettingsSection onBackToDashboard={handleBackToDashboard} />;
}
