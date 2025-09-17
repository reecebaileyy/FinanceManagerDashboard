import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { AppProviders } from "./providers";
import { getServerSession } from "@features/auth/server/session";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from "@features/i18n/localization-constants";
import { DEFAULT_THEME, THEME_COOKIE_NAME, coerceTheme } from "@features/theme";
import { CSRF_COOKIE_NAME } from "@lib/security";

import type { Metadata } from "next";
import type { ReactNode } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Manager Dashboard",
  description:
    "Prototype dashboard shell for the Finance Manager platform referenced in the CS490 starter proposal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookieValue = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const initialTheme = coerceTheme(themeCookieValue, DEFAULT_THEME);
  const csrfToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const initialSession = await getServerSession(cookieStore);

  const initialLocale = DEFAULT_LOCALE;
  const initialCurrency = DEFAULT_CURRENCY;
  const initialTimeZone = DEFAULT_TIME_ZONE;

  return (
    <html lang={initialLocale} data-theme={initialTheme} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders
          csrfToken={csrfToken}
          initialTheme={initialTheme}
          initialSession={initialSession}
          initialLocale={initialLocale}
          initialCurrency={initialCurrency}
          initialTimeZone={initialTimeZone}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

