export type PlanTier = "free" | "pro" | "family";
export type UserStatus = "active" | "invited" | "suspended";

export interface AuthUser {
  id: string;
  email: string;
  status: UserStatus;
  planTier: PlanTier;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  timezone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface AuthUserWithSecrets extends AuthUser {
  passwordHash: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface EmailVerificationTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface AuditEventInput {
  action: string;
  actor: string;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
