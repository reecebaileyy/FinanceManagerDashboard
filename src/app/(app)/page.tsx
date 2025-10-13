'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import ChatWidget from '@features/ai-chat/ChatWidget';
import { useSession } from '@features/auth';
import { LandingSection, type LandingQuickLink } from '@features/landing';
import { SECTION_PATHS } from '@features/navigation';

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isAuthenticated, startDemoSession, signOut } = useSession();

  const quickLinks: LandingQuickLink[] = [
    {
      href: SECTION_PATHS.transactions,
      title: 'Track transactions',
      description: 'Filter, tag, and reconcile spending in seconds.',
    },
    {
      href: SECTION_PATHS.budgets,
      title: 'Adjust budgets',
      description: 'Review variance and update allocations in real time.',
    },
    {
      href: SECTION_PATHS.goals,
      title: 'Plan your goals',
      description: 'Set milestones and monitor progress toward savings.',
    },
    {
      href: SECTION_PATHS.bills,
      title: 'Stay ahead of bills',
      description: "See upcoming payments and schedule reminders before they're due.",
    },
    {
      href: SECTION_PATHS.insights,
      title: 'Ask the AI assistant',
      description: 'Request personalized guidance and recommended next steps.',
    },
    {
      href: SECTION_PATHS.settings,
      title: 'Manage preferences',
      description: 'Update profile details, notification rules, and security settings.',
    },
  ];

  const handleGetStarted = () => {
    router.push(SECTION_PATHS.signup);
  };

  const handlePreviewDashboard = async () => {
    await startDemoSession();
    const target = searchParams?.get('redirect') ?? SECTION_PATHS.dashboard;
    router.push(target);
  };

  const handleLogin = () => {
    router.push(SECTION_PATHS.login);
  };

  const handleLogout = async () => {
    await signOut();
    router.push(SECTION_PATHS.home);
  };

  const username = session?.user.displayName ?? 'Guest';

  return (
    <>
      <LandingSection
        isAuthenticated={isAuthenticated}
        username={username}
        onGetStarted={handleGetStarted}
        onPreviewDashboard={handlePreviewDashboard}
        onLogin={handleLogin}
        onLogout={handleLogout}
        quickLinks={quickLinks}
      />
      <ChatWidget />
    </>
  );
}
