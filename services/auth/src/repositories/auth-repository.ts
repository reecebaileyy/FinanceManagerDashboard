import type {
  AuthUser,
  AuthUserWithSecrets,
  AuditEventInput,
  EmailVerificationTokenRecord,
  PasswordResetTokenRecord,
  RefreshTokenRecord,
} from "../domain/models";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  planTier: AuthUser["planTier"];
  firstName?: string | null;
  lastName?: string | null;
  timezone?: string | null;
}

export interface SaveRefreshTokenInput {
  id: string;
  userId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RefreshTokenWithUser extends RefreshTokenRecord {
  user: AuthUser;
}

export interface AuthRepository {
  createUser(input: CreateUserInput): Promise<AuthUser>;
  findUserByEmail(email: string): Promise<AuthUserWithSecrets | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  markEmailVerified(userId: string, verifiedAt: Date): Promise<AuthUser>;
  saveEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<EmailVerificationTokenRecord>;
  consumeEmailVerificationToken(token: string): Promise<EmailVerificationTokenRecord | null>;
  saveRefreshToken(input: SaveRefreshTokenInput): Promise<RefreshTokenRecord>;
  findRefreshTokenById(id: string): Promise<RefreshTokenWithUser | null>;
  revokeRefreshToken(id: string, revokedAt: Date, replacedByTokenId?: string | null): Promise<void>;
  revokeRefreshTokensForUser(userId: string, revokedAt: Date): Promise<void>;
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetTokenRecord>;
  consumePasswordResetToken(token: string, consumedAt: Date): Promise<PasswordResetTokenRecord | null>;
  updatePasswordHash(userId: string, passwordHash: string, when: Date): Promise<void>;
  updateLastLogin(userId: string, when: Date): Promise<void>;
  createAuditEvent(event: AuditEventInput): Promise<void>;
}
