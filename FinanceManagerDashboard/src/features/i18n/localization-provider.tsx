"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TIME_ZONE,
  LOCALIZATION_STORAGE_KEY,
} from "./localization-constants";

type LocalizationPreferences = {
  locale: string;
  currency: string;
  timeZone: string;
};

type LocalizationContextValue = LocalizationPreferences & {
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  updatePreferences: (next: Partial<LocalizationPreferences>) => void;
};

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

function normalizeDate(date: Date | number | string) {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === "number") {
    return new Date(date);
  }
  return new Date(Date.parse(date));
}

type FormatterCache = {
  currency: Map<string, Intl.NumberFormat>;
  number: Map<string, Intl.NumberFormat>;
  percent: Map<string, Intl.NumberFormat>;
  date: Map<string, Intl.DateTimeFormat>;
};

function createCache(): FormatterCache {
  return {
    currency: new Map(),
    number: new Map(),
    percent: new Map(),
    date: new Map(),
  };
}

function hydrateFromStorage(): Partial<LocalizationPreferences> | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(LOCALIZATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.locale !== "string" ||
      typeof parsed.currency !== "string" ||
      typeof parsed.timeZone !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function detectBrowserPreferences(): Partial<LocalizationPreferences> {
  if (typeof window === "undefined") {
    return {};
  }

  const options = Intl.DateTimeFormat().resolvedOptions();
  const locale = navigator.language || options.locale || DEFAULT_LOCALE;
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;

  return {
    locale,
    timeZone,
  };
}

export interface LocalizationProviderProps {
  children: ReactNode;
  initialLocale?: string;
  initialCurrency?: string;
  initialTimeZone?: string;
}

export function LocalizationProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  initialCurrency = DEFAULT_CURRENCY,
  initialTimeZone = DEFAULT_TIME_ZONE,
}: LocalizationProviderProps) {
  const [preferences, setPreferences] = useState<LocalizationPreferences>(() => ({
    locale: initialLocale,
    currency: initialCurrency,
    timeZone: initialTimeZone,
  }));

  const cacheRef = useRef<FormatterCache>(createCache());
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRef.current) {
      return;
    }

    const stored = hydrateFromStorage();
    const detected = detectBrowserPreferences();

    setPreferences((prev) => {
      const next = { ...prev, ...detected, ...stored };
      return next;
    });

    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    cacheRef.current = createCache();
  }, [preferences.locale, preferences.currency, preferences.timeZone]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LOCALIZATION_STORAGE_KEY, JSON.stringify(preferences));
    document.documentElement.lang = preferences.locale;
    document.documentElement.setAttribute("data-locale", preferences.locale);
    document.documentElement.setAttribute("data-currency", preferences.currency);
    document.documentElement.setAttribute("data-timezone", preferences.timeZone);
  }, [preferences]);

  const value = useMemo<LocalizationContextValue>(() => {
    const getCurrencyFormatter = (options: Intl.NumberFormatOptions = {}) => {
      const key = JSON.stringify(options);
      const cache = cacheRef.current.currency;
      const existing = cache.get(key);
      if (existing) {
        return existing;
      }
      const formatter = new Intl.NumberFormat(preferences.locale, {
        style: "currency",
        currency: preferences.currency,
        ...options,
      });
      cache.set(key, formatter);
      return formatter;
    };

    const getNumberFormatter = (options: Intl.NumberFormatOptions = {}) => {
      const key = JSON.stringify(options);
      const cache = cacheRef.current.number;
      const existing = cache.get(key);
      if (existing) {
        return existing;
      }
      const formatter = new Intl.NumberFormat(preferences.locale, {
        maximumFractionDigits: 2,
        ...options,
      });
      cache.set(key, formatter);
      return formatter;
    };

    const getPercentFormatter = (options: Intl.NumberFormatOptions = {}) => {
      const key = JSON.stringify(options);
      const cache = cacheRef.current.percent;
      const existing = cache.get(key);
      if (existing) {
        return existing;
      }
      const formatter = new Intl.NumberFormat(preferences.locale, {
        style: "percent",
        maximumFractionDigits: 1,
        ...options,
      });
      cache.set(key, formatter);
      return formatter;
    };

    const getDateFormatter = (options: Intl.DateTimeFormatOptions = {}) => {
      const key = JSON.stringify(options);
      const cache = cacheRef.current.date;
      const existing = cache.get(key);
      if (existing) {
        return existing;
      }
      const formatter = new Intl.DateTimeFormat(preferences.locale, {
        timeZone: preferences.timeZone,
        ...options,
      });
      cache.set(key, formatter);
      return formatter;
    };

    return {
      ...preferences,
      formatCurrency: (value, options) => getCurrencyFormatter(options).format(value),
      formatNumber: (value, options) => getNumberFormatter(options).format(value),
      formatPercent: (value, options) => getPercentFormatter(options).format(value),
      formatDate: (value, options) => getDateFormatter(options).format(normalizeDate(value)),
      updatePreferences: (next) => {
        setPreferences((prev) => {
          const merged = { ...prev, ...next };
          if (
            merged.locale === prev.locale &&
            merged.currency === prev.currency &&
            merged.timeZone === prev.timeZone
          ) {
            return prev;
          }
          return merged;
        });
      },
    };
  }, [preferences]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationContextValue {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within a LocalizationProvider");
  }
  return context;
}
