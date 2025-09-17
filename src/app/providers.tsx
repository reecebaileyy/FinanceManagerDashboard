"use client";

import type { ReactNode } from "react";

import { SessionProvider, type AuthSession } from "@features/auth";
import { LocalizationProvider } from "@features/i18n";
import { ThemeProvider, type Theme } from "@features/theme";
import { CsrfProvider } from "@lib/security";
import { ReactQueryProvider } from "@lib/react-query";

export interface AppProvidersProps {
  children: ReactNode;
  initialTheme: Theme;
  csrfToken?: string;
  initialSession?: AuthSession | null;
  initialLocale?: string;
  initialCurrency?: string;
  initialTimeZone?: string;
}

export function AppProviders({
  children,
  initialTheme,
  csrfToken,
  initialSession,
  initialLocale,
  initialCurrency,
  initialTimeZone,
}: AppProvidersProps) {
  return (
    <CsrfProvider initialToken={csrfToken}>
      <ReactQueryProvider>
        <LocalizationProvider
          initialLocale={initialLocale}
          initialCurrency={initialCurrency}
          initialTimeZone={initialTimeZone}
        >
          <ThemeProvider initialTheme={initialTheme}>
            <SessionProvider initialSession={initialSession}>{children}</SessionProvider>
          </ThemeProvider>
        </LocalizationProvider>
      </ReactQueryProvider>
    </CsrfProvider>
  );
}
