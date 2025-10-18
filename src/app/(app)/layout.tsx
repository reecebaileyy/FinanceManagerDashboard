'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { DashboardShell } from '@components/dashboard/dashboard-shell';
import { Sidebar } from '@components/dashboard/sidebar';
import { TopBar } from '@components/dashboard/topbar';
import { useSession } from '@features/auth';
import {
  NAV_ITEMS,
  PROTECTED_SECTIONS,
  resolveSectionIdFromPath,
  SECTION_PATHS,
  type SectionId,
} from '@features/navigation';
import { getClientEnv } from '@lib/config/env/client';
import { getInitials } from '@lib/utils/get-initials';

const CLIENT_ENV = getClientEnv();
const ENVIRONMENT_LABEL = CLIENT_ENV.NEXT_PUBLIC_APP_ENV;
const API_BASE_URL = CLIENT_ENV.NEXT_PUBLIC_API_BASE_URL;

const TIPS = [
  'Set realistic monthly budgets to avoid overspending.',
  'Try the 50/30/20 rule: 50 percent needs, 30 percent wants, 20 percent savings.',
  'Enable bill reminders so you never miss a payment.',
  'Export your transactions regularly to simplify tax season.',
  'Check spending by category to spot where your money goes.',
  'Use a strong password and enable two factor auth for better protection.',
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isAuthenticated } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeSection: SectionId = useMemo(
    () => resolveSectionIdFromPath(pathname || '/'),
    [pathname],
  );
  const displayName = session?.user.displayName ?? 'Guest';

  const sidebarTip = useMemo(() => {
    const sectionIndex = NAV_ITEMS.findIndex((item) => item.id === activeSection);
    const baseIndex = sectionIndex >= 0 ? sectionIndex : 0;
    return TIPS[baseIndex % TIPS.length];
  }, [activeSection]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleNavigate = (section: SectionId) => {
    const target = NAV_ITEMS.find((item) => item.id === section);

    if (!target) {
      return;
    }

    if (PROTECTED_SECTIONS.has(section) && !isAuthenticated) {
      const redirect = encodeURIComponent(target.href);
      router.push(`${SECTION_PATHS.login}?redirect=${redirect}`);
      return;
    }

    router.push(target.href);
  };

  const { signOut } = useSession();

  const handleLogout = async () => {
    await signOut();
    router.push(SECTION_PATHS.home);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const userInitials = getInitials(displayName);

  return (
    <DashboardShell
      isSidebarOpen={isSidebarOpen}
      onSidebarClose={closeSidebar}
      sidebar={
        <Sidebar
          items={NAV_ITEMS.filter((item) => {
            // hide login/signup for authenticated users, show logout instead
            if (isAuthenticated && (item.id === 'login' || item.id === 'signup')) {
              return false;
            }

            // show logout only for authenticated users
            if (item.id === 'logout') {
              return isAuthenticated;
            }

            return true;
          })}
          activeId={activeSection}
          onNavigate={(section) => {
            // intercept logout click
            if (section === 'logout') {
              void handleLogout();
              closeSidebar();
              return;
            }

            handleNavigate(section);
          }}
          isAuthenticated={isAuthenticated}
          tip={sidebarTip}
          onRequestClose={closeSidebar}
          isOpen={isSidebarOpen}
        />
      }
      topbar={
        <TopBar
          searchTerm={searchTerm}
          onSearchTermChange={handleSearch}
          username={displayName}
          userInitials={userInitials}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
      }
      footer={
        <footer>
          (c) 2025 Finance Manager. All rights reserved. CS491 Senior Project - California State
          University, Fullerton
          {' | Environment: '}
          <strong>{ENVIRONMENT_LABEL}</strong>
          {' | API: '}
          <span>{API_BASE_URL}</span>
        </footer>
      }
    >
      {children}
    </DashboardShell>
  );
}
