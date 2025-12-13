import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

import { SessionProvider } from '@features/auth/context/session-context';
import { createSessionPayload } from '@features/auth/session/cookie';
import { LocalizationProvider } from '@features/i18n/localization-provider';
import { createTestQueryClient } from '@lib/react-query';

import type { AuthSession } from '@features/auth/session/types';
import type { ReactElement, ReactNode } from 'react';

type RenderWithProvidersOptions = RenderOptions & {
  queryClient?: QueryClient;
  session?: AuthSession | null;
};

const defaultSession: AuthSession = createSessionPayload({
  kind: 'authenticated',
  user: {
    id: 'user-test',
    email: 'test.user@financemanager.app',
    displayName: 'Test User',
    roles: ['member'],
  },
  metadata: {
    featureFlags: ['test-mode'],
  },
});

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions,
): RenderResult {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  const shouldDisposeQueryClient = !options?.queryClient;
  const session = options?.session === undefined ? defaultSession : options.session;

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <SessionProvider initialSession={session}>
      <LocalizationProvider
        initialLocale="en-US"
        initialCurrency="USD"
        initialTimeZone="America/New_York"
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </LocalizationProvider>
    </SessionProvider>
  );

  const result = render(ui, { wrapper: Wrapper, ...options });

  const cleanup = () => {
    if (shouldDisposeQueryClient) {
      queryClient.clear();
    }
    result.unmount();
  };

  return {
    ...result,
    unmount: cleanup,
  };
}
