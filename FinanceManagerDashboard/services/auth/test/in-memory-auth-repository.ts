import { randomUUID } from "node:crypto";

import type {
  AuthRepository,
  CreateUserInput,
  RefreshTokenWithUser,
  SaveRefreshTokenInput,
} from "../src/repositories/auth-repository";
import type {
  AuditEventInput,
  AuthUser,
  AuthUserWithSecrets,
  EmailVerificationTokenRecord,
  PasswordResetTokenRecord,
  RefreshTokenRecord,
} from "../src/domain/models";

export class InMemoryAuthRepository implements AuthRepository {
  private users = new Map<string, AuthUserWithSecrets>();

  private emailIndex = new Map<string, string>();

  private emailTokens = new Map<string, EmailVerificationTokenRecord>();

  private refreshTokens = new Map<string, RefreshTokenRecord>();

  private passwordResetTokens = new Map<string, PasswordResetTokenRecord>();

  private auditEvents: AuditEventInput[] = [];

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const now = new Date();
    const id = randomUUID();

    const user: AuthUserWithSecrets = {
      id,
      email: input.email,
      status: "active",
      planTier: input.planTier,
      emailVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      timezone: input.timezone ?? null,
      passwordHash: input.passwordHash,
    };

    this.users.set(id, user);
    this.emailIndex.set(user.email, id);

    return this.stripPassword(user);
  }

  async findUserByEmail(email: string): Promise<AuthUserWithSecrets | null> {
    const id = this.emailIndex.get(email);
    if (!id) {
      return null;
    }

    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    const user = this.users.get(id);
    return user ? this.stripPassword(user) : null;
  }

  async markEmailVerified(userId: string, verifiedAt: Date): Promise<AuthUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.emailVerifiedAt = verifiedAt;
    user.updatedAt = new Date();
    this.users.set(userId, user);

    return this.stripPassword(user);
  }

  async saveEmailVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<EmailVerificationTokenRecord> {
    const record: EmailVerificationTokenRecord = {
      id: randomUUID(),
      userId,
      token,
      expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    };

    this.emailTokens.set(token, record);

    return record;
  }

  async consumeEmailVerificationToken(
    token: string,
  ): Promise<EmailVerificationTokenRecord | null> {
    const record = this.emailTokens.get(token);

    if (!record || record.consumedAt || record.expiresAt.getTime() < Date.now()) {
      return null;
    }

    const updated = { ...record, consumedAt: new Date() };
    this.emailTokens.set(token, updated);
    return updated;
  }

  async saveRefreshToken(input: SaveRefreshTokenInput): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };

    this.refreshTokens.set(record.id, record);

    return { ...record };
  }

  async findRefreshTokenById(id: string): Promise<RefreshTokenWithUser | null> {
    const record = this.refreshTokens.get(id);
    if (!record) {
      return null;
    }

    const user = this.users.get(record.userId);

    if (!user) {
      return null;
    }

    return {
      ...record,
      user: this.stripPassword(user),
    };
  }

  async revokeRefreshToken(
    id: string,
    revokedAt: Date,
    replacedByTokenId?: string | null,
  ): Promise<void> {
    const record = this.refreshTokens.get(id);
    if (!record) {
      return;
    }

    record.revokedAt = revokedAt;
    record.replacedByTokenId = replacedByTokenId ?? null;
    this.refreshTokens.set(id, record);
  }

  async revokeRefreshTokensForUser(userId: string, revokedAt: Date): Promise<void> {
    for (const [id, record] of this.refreshTokens.entries()) {
      if (record.userId === userId && !record.revokedAt) {
        record.revokedAt = revokedAt;
        this.refreshTokens.set(id, record);
      }
    }
  }

  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordResetTokenRecord> {
    const record: PasswordResetTokenRecord = {
      id: randomUUID(),
      userId,
      token,
      expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    };

    this.passwordResetTokens.set(token, record);

    return record;
  }

  async consumePasswordResetToken(
    token: string,
    consumedAt: Date,
  ): Promise<PasswordResetTokenRecord | null> {
    const record = this.passwordResetTokens.get(token);

    if (!record || record.consumedAt || record.expiresAt.getTime() < consumedAt.getTime()) {
      return null;
    }

    const updated = { ...record, consumedAt };
    this.passwordResetTokens.set(token, updated);

    return updated;
  }

  async updatePasswordHash(userId: string, passwordHash: string, when: Date): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.passwordHash = passwordHash;
    user.updatedAt = when;
    this.users.set(userId, user);
  }

  async updateLastLogin(userId: string, when: Date): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    user.lastLoginAt = when;
    this.users.set(userId, user);
  }

  async createAuditEvent(event: AuditEventInput): Promise<void> {
    this.auditEvents.push({ ...event });
  }

  getAuditEvents() {
    return [...this.auditEvents];
  }

  private stripPassword(user: AuthUserWithSecrets): AuthUser {
    const { passwordHash, ...rest } = user;
    return { ...rest };
  }
}
