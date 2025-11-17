'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
  createSessionPayload,
  getCookieMaxAgeSeconds,
  parseSessionCookie,
  serializeSessionCookie,
} from '../session/cookie';
import {
  type AuthSession,
  type SessionContextValue,
  type SessionKind,
  type SessionStatus,
  type SignInCredentials,
  type SignInResult,
  type SignupPayload,
  type SignupRole,
  type TwoFactorChallenge,
  type TwoFactorSubmission,
} from '../session/types';

const DEFAULT_DISPLAY_NAME = 'Finance Manager user';
const ADMIN_MATCHER = /(admin|security|finance)/i;
// hint flags parsed from email for demo 2FA behavior

interface SessionProviderProps {
  children: ReactNode;
  initialSession?: AuthSession | null;
  initialCookie?: string | null;
}

interface SessionState {
  session: AuthSession | null;
  pendingChallenge: TwoFactorChallenge | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function resolveDisplayName(fullNameOrEmail: string): string {
  const trimmed = fullNameOrEmail.trim();

  if (!trimmed) {
    return DEFAULT_DISPLAY_NAME;
  }

  if (!trimmed.includes('@')) {
    return trimmed;
  }

  const [localPart] = trimmed.split('@');
  if (!localPart) {
    return DEFAULT_DISPLAY_NAME;
  }

  return (
    localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ') || DEFAULT_DISPLAY_NAME
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function deriveUserId(email: string): string {
  const cleaned = normalizeEmail(email).replace(/[^a-z0-9]/g, '-');
  const key = cleaned.length > 0 ? cleaned : 'anonymous';
  return `user-${key}`;
}

function deriveRoles(email: string, roleHint?: SignupRole): string[] {
  if (roleHint === 'admin') {
    return ['admin'];
  }

  const normalized = normalizeEmail(email);
  if (normalized.endsWith('@financemanager.app') || ADMIN_MATCHER.test(normalized)) {
    return ['admin'];
  }

  if (roleHint === 'advisor') {
    return ['advisor'];
  }

  return ['member'];
}

function shouldRequireTwoFactor(email: string, roleHint?: SignupRole): boolean {
  const normalized = normalizeEmail(email);
  if (roleHint === 'admin') {
    return true;
  }

  return (
    ADMIN_MATCHER.test(normalized) ||
    normalized.includes('+mfa') ||
    normalized.endsWith('@financemanager.app') ||
    normalized.includes('+secure')
  );
}

function selectTwoFactorMethod(email: string): TwoFactorChallenge['method'] {
  const normalized = normalizeEmail(email);
  if (normalized.includes('+sms')) {
    return 'sms';
  }

  if (normalized.includes('+email')) {
    return 'email';
  }

  return 'authenticator';
}

function generateChallenge(
  email: string,
  displayName: string,
  redirectTo?: string,
  roleHint?: SignupRole,
): TwoFactorChallenge {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `challenge-${Date.now()}`,
    method: selectTwoFactorMethod(email),
    displayName,
    destination: email,
    email,
    createdAt: new Date().toISOString(),
    redirectTo,
    roleHint,
  };
}

function persistSessionCookie(session: AuthSession | null) {
  if (typeof document === 'undefined') {
    return;
  }

  if (!session) {
    document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=${SESSION_COOKIE_PATH}; SameSite=Strict`;
    return;
  }

  const value = serializeSessionCookie(session);
  const maxAge = Math.max(getCookieMaxAgeSeconds(session), 1);
  const attributes = [`Path=${SESSION_COOKIE_PATH}`, 'SameSite=Strict', `Max-Age=${maxAge}`];

  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    attributes.push('Secure');
  }

  document.cookie = `${SESSION_COOKIE_NAME}=${value}; ${attributes.join('; ')}`;
}

function deriveStatus(session: AuthSession | null): SessionStatus {
  if (!session) {
    return 'unauthenticated';
  }

  return session.kind satisfies SessionKind;
}

function resolveInitialSession(
  initialSession?: AuthSession | null,
  initialCookie?: string | null,
): AuthSession | null {
  if (initialSession) {
    return initialSession;
  }

  if (initialCookie) {
    return parseSessionCookie(initialCookie);
  }

  return null;
}

export function SessionProvider({ children, initialSession, initialCookie }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>(() => ({
    session: resolveInitialSession(initialSession, initialCookie),
    pendingChallenge: null,
  }));

  const status = useMemo<SessionStatus>(() => deriveStatus(state.session), [state.session]);
  const isDemo = state.session?.kind === 'demo';
  const isAuthenticated = Boolean(state.session);

  const commitSession = useCallback((session: AuthSession | null) => {
    setState((previous) => ({ ...previous, session }));
    persistSessionCookie(session);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // ignore network errors during logout
    }

    commitSession(null);
    setState((previous) => ({ ...previous, pendingChallenge: null }));
  }, [commitSession]);

  const clearSession = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const cancelTwoFactorChallenge = useCallback(() => {
    setState((previous) => ({ ...previous, pendingChallenge: null }));
  }, []);

  const completeTwoFactor = useCallback(
    async (submission: TwoFactorSubmission, options?: { redirectTo?: string }) => {
      if (!state.pendingChallenge) {
        throw new Error('Your verification session expired. Please log in again.');
      }

      if (submission.mode === 'code' && submission.code === '000000') {
        throw new Error('000000 is not a valid code. Please use the latest code from your device.');
      }

      const challenge = state.pendingChallenge;
      const displayName =
        challenge.displayName && challenge.displayName.length > 0
          ? challenge.displayName
          : resolveDisplayName(challenge.email ?? DEFAULT_DISPLAY_NAME);
      const roles = deriveRoles(challenge.email ?? '', challenge.roleHint);

      const nextSession = createSessionPayload({
        kind: 'authenticated',
        user: {
          id: deriveUserId(challenge.email ?? displayName),
          email: challenge.email ?? 'demo@financemanager.app',
          displayName,
          roles,
        },
        metadata: {
          isTwoFactorEnrolled: true,
        },
      });

      setState({ session: nextSession, pendingChallenge: null });
      persistSessionCookie(nextSession);

      if (options?.redirectTo) {
        // caller handles navigation
      }

      return nextSession;
    },
    [state.pendingChallenge],
  );

  const signIn = useCallback(
    async (
      credentials: SignInCredentials,
      options?: { redirectTo?: string },
    ): Promise<SignInResult> => {
      const normalizedEmail = normalizeEmail(credentials.email);
      const displayName = resolveDisplayName(credentials.email);

      // If policy requires 2FA, initiate challenge first (client-side mock)
      const requiresTwoFactor = shouldRequireTwoFactor(normalizedEmail);
      if (requiresTwoFactor) {
        const challenge = generateChallenge(normalizedEmail, displayName, options?.redirectTo);
        setState((previous) => ({ ...previous, pendingChallenge: challenge }));
        return { status: 'needs_two_factor', challenge };
      }

      // Otherwise call backend auth service to validate credentials and set httpOnly cookies
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: credentials.password }),
        credentials: 'include',
      });

      if (!response.ok) {
        // Do not create a session on failed login
        throw new Error('Invalid email or password.');
      }

      interface LoginOk {
        data?: {
          user?: { id: string; email: string; firstName?: string | null; lastName?: string | null };
          session?: { accessTokenExpiresAt: string };
        };
      }
      const payload = (await response.json()) as unknown as LoginOk;
      const user = payload?.data?.user;
      const sessionInfo = payload?.data?.session;

      const uiSession = createSessionPayload({
        kind: 'authenticated',
        user: {
          id: user?.id ?? deriveUserId(normalizedEmail),
          email: user?.email ?? normalizedEmail,
          displayName,
          roles: deriveRoles(normalizedEmail),
        },
        issuedAt: new Date().toISOString(),
        expiresAt:
          sessionInfo?.accessTokenExpiresAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        metadata: {
          isTwoFactorEnrolled: shouldRequireTwoFactor(normalizedEmail),
        },
      });

      setState({ session: uiSession, pendingChallenge: null });
      persistSessionCookie(uiSession);

      return { status: 'authenticated', session: uiSession };
    },
    [],
  );

  const register = useCallback(
    async (payload: SignupPayload, options?: { redirectTo?: string }): Promise<SignInResult> => {
      const normalizedEmail = normalizeEmail(payload.email);
      const displayName = resolveDisplayName(payload.fullName || payload.email);
      const requiresTwoFactor = shouldRequireTwoFactor(normalizedEmail, payload.role);

      if (requiresTwoFactor) {
        const challenge = generateChallenge(
          normalizedEmail,
          displayName,
          options?.redirectTo,
          payload.role,
        );
        setState((previous) => ({ ...previous, pendingChallenge: challenge }));
        return { status: 'needs_two_factor', challenge };
      }

      const nextSession = createSessionPayload({
        kind: 'authenticated',
        user: {
          id: deriveUserId(normalizedEmail),
          email: normalizedEmail,
          displayName,
          roles: deriveRoles(normalizedEmail, payload.role),
        },
        metadata: {
          isTwoFactorEnrolled:
            payload.role === 'admin' ? true : shouldRequireTwoFactor(normalizedEmail, payload.role),
        },
      });

      setState({ session: nextSession, pendingChallenge: null });
      persistSessionCookie(nextSession);

      return { status: 'authenticated', session: nextSession };
    },
    [],
  );

  const startDemoSession = useCallback(async (options?: { displayName?: string }) => {
    const candidate = options?.displayName?.trim();
    const displayName = candidate && candidate.length > 0 ? candidate : 'Alex Demo';
    const nextSession = createSessionPayload({
      kind: 'demo',
      user: {
        id: 'user-demo',
        email: 'demo@financemanager.app',
        displayName,
        roles: ['demo'],
      },
      metadata: {
        featureFlags: ['demo-mode'],
      },
      ttlSeconds: 60 * 60 * 8,
    });

    setState({ session: nextSession, pendingChallenge: null });
    persistSessionCookie(nextSession);
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    return {
      session: state.session,
      status,
      isAuthenticated,
      isDemo,
      pendingChallenge: state.pendingChallenge,
      signIn,
      signOut,
      register,
      startDemoSession,
      completeTwoFactor,
      cancelTwoFactorChallenge,
      clearSession,
    };
  }, [
    cancelTwoFactorChallenge,
    clearSession,
    completeTwoFactor,
    isAuthenticated,
    isDemo,
    register,
    signIn,
    signOut,
    startDemoSession,
    state.pendingChallenge,
    state.session,
    status,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
}
