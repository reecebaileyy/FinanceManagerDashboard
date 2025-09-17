export type SessionKind = "authenticated" | "demo";
export type SignupRole = "individual" | "advisor" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  avatarUrl?: string;
}

export interface SessionMetadata {
  isTwoFactorEnrolled?: boolean;
  featureFlags?: string[];
}

export interface AuthSession {
  version: 1;
  kind: SessionKind;
  user: SessionUser;
  issuedAt: string;
  expiresAt: string;
  metadata?: SessionMetadata;
}

export type SessionStatus = "unauthenticated" | SessionKind;

export type TwoFactorMethod = "email" | "sms" | "authenticator" | "push";

export interface TwoFactorChallenge {
  id: string;
  method: TwoFactorMethod;
  displayName: string;
  destination?: string;
  email?: string;
  createdAt: string;
  redirectTo?: string;
  roleHint?: SignupRole;
}

export type TwoFactorSubmission =
  | { mode: "code"; code: string }
  | { mode: "backup"; backupCode: string };

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignupPayload {
  fullName: string;
  email: string;
  password: string;
  role: SignupRole;
}

export type SignInResult =
  | {
      status: "authenticated";
      session: AuthSession;
    }
  | {
      status: "needs_two_factor";
      challenge: TwoFactorChallenge;
    };

export interface SessionContextValue {
  session: AuthSession | null;
  status: SessionStatus;
  isAuthenticated: boolean;
  isDemo: boolean;
  pendingChallenge: TwoFactorChallenge | null;
  signIn: (credentials: SignInCredentials, options?: { redirectTo?: string }) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  register: (payload: SignupPayload, options?: { redirectTo?: string }) => Promise<SignInResult>;
  startDemoSession: (options?: { displayName?: string }) => Promise<void>;
  completeTwoFactor: (submission: TwoFactorSubmission, options?: { redirectTo?: string }) => Promise<AuthSession>;
  cancelTwoFactorChallenge: () => void;
  clearSession: () => Promise<void>;
}
