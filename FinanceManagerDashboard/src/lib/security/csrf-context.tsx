"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { CSRF_COOKIE_NAME, readCookie } from "./csrf";

type CsrfContextValue = {
  token?: string;
  refresh: () => void;
};

const CsrfContext = createContext<CsrfContextValue | undefined>(undefined);

export interface CsrfProviderProps {
  children: ReactNode;
  initialToken?: string;
}

export function CsrfProvider({ children, initialToken }: CsrfProviderProps) {
  const [token, setToken] = useState<string | undefined>(initialToken);

  const refresh = useCallback(() => {
    const next = readCookie(CSRF_COOKIE_NAME);
    setToken((current) => (current === next ? current : next));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<CsrfContextValue>(() => ({
    token,
    refresh,
  }), [token, refresh]);

  return <CsrfContext.Provider value={value}>{children}</CsrfContext.Provider>;
}

export function useCsrf(): CsrfContextValue {
  const context = useContext(CsrfContext);

  if (!context) {
    throw new Error("useCsrf must be used within a CsrfProvider");
  }

  return context;
}

export function useCsrfHeader(): Readonly<Record<string, string>> {
  const { token } = useCsrf();

  if (!token) {
    return {};
  }

  return {
    "x-csrf-token": token,
  };
}