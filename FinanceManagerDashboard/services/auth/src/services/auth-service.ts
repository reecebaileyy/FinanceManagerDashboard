import argon2 from "argon2";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import type { AuthRepository } from "../repositories/auth-repository";
import type { Env } from "../env";
import type { EmailService } from "./email-service";
import type { AuthUser, AuthUserWithSecrets } from "../domain/models";
import { badRequest, conflict, forbidden, unauthorized } from "../errors";

const ACCESS_TOKEN_AUDIENCE = "finance-manager-dashboard";
const ACCESS_TOKEN_ISSUER = "finance-manager-auth";

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export interface SignupInput {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  planTier?: "free" | "pro" | "family";
  timezone?: string | null;
  acceptTerms?: boolean;
  marketingOptIn?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  challengeId?: string;
  mfaCode?: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface SignupResult {
  user: AuthUser;
  tokens: AuthTokens;
  requiresEmailVerification: boolean;
  debug?: {
    emailVerificationToken: string;
  };
}

export interface LoginResult {
  user: AuthUser;
  tokens: AuthTokens;
  emailVerified: boolean;
}

export interface RefreshResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface PasswordResetRequestResult {
  requested: boolean;
}

export interface PasswordResetResult {
  user: AuthUser;
}

export interface VerifyEmailResult {
  user: AuthUser;
}

export interface AuthServiceDependencies {
  repository: AuthRepository;
  env: Env;
  emailService: EmailService;
}

export class AuthService {
  private readonly repository: AuthRepository;

  private readonly env: Env;

  private readonly emailService: EmailService;

  constructor(dependencies: AuthServiceDependencies) {
    this.repository = dependencies.repository;
    this.env = dependencies.env;
    this.emailService = dependencies.emailService;
  }

  async signup(input: SignupInput, context: RequestContext): Promise<SignupResult> {
    const email = this.normalizeEmail(input.email);

    if (!input.acceptTerms) {
      throw badRequest("AUTH_TERMS_NOT_ACCEPTED", "You must accept the terms of service.");
    }

    const existing = await this.repository.findUserByEmail(email);

    if (existing) {
      throw conflict("AUTH_EMAIL_EXISTS", "An account already exists for this email.");
    }

    const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
    const planTier = input.planTier ?? "free";

    const user = await this.repository.createUser({
      email,
      passwordHash,
      planTier,
      firstName: this.normalizeOptionalString(input.firstName),
      lastName: this.normalizeOptionalString(input.lastName),
      timezone: this.normalizeOptionalString(input.timezone),
    });

    const verificationToken = this.generateEmailVerificationToken();
    await this.repository.saveEmailVerificationToken(
      user.id,
      verificationToken.token,
      verificationToken.expiresAt,
    );

    await this.repository.createAuditEvent({
      action: "auth.signup",
      actor: user.id,
      userId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        marketingOptIn: Boolean(input.marketingOptIn),
        planTier,
      },
    });

    const tokens = await this.issueSession(user, context, undefined);

    await this.emailService.sendVerificationEmail({
      user,
      verificationToken: verificationToken.token,
      expiresAt: verificationToken.expiresAt,
    });

    return {
      user,
      tokens,
      requiresEmailVerification: true,
      debug: this.env.isProduction
        ? undefined
        : {
            emailVerificationToken: verificationToken.token,
          },
    };
  }

  async login(input: LoginInput, context: RequestContext): Promise<LoginResult> {
    const email = this.normalizeEmail(input.email);
    const record = await this.repository.findUserByEmail(email);

    if (!record) {
      throw unauthorized("AUTH_INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    const passwordValid = await argon2.verify(record.passwordHash, input.password);

    if (!passwordValid) {
      throw unauthorized("AUTH_INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    if (record.status === "suspended") {
      throw forbidden("AUTH_ACCOUNT_SUSPENDED", "Your account is currently suspended.");
    }

    const user = this.stripPassword(record);
    const tokens = await this.issueSession(user, context, undefined, input.rememberMe);

    await this.repository.updateLastLogin(user.id, new Date());
    await this.repository.createAuditEvent({
      action: "auth.login",
      actor: user.id,
      userId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        rememberMe: Boolean(input.rememberMe),
      },
    });

    return {
      user,
      tokens,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }

  async refreshSession(refreshToken: string, context: RequestContext): Promise<RefreshResult> {
    const parsed = this.parseCompositeToken(refreshToken, "AUTH_INVALID_REFRESH_TOKEN");
    const record = await this.repository.findRefreshTokenById(parsed.id);

    if (!record) {
      throw unauthorized("AUTH_INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.");
    }

    const now = new Date();

    if (record.revokedAt) {
      throw unauthorized("AUTH_REFRESH_TOKEN_REVOKED", "Refresh token is no longer valid.");
    }

    if (record.expiresAt.getTime() <= now.getTime()) {
      await this.repository.revokeRefreshToken(record.id, now);
      throw unauthorized("AUTH_REFRESH_TOKEN_EXPIRED", "Refresh token expired.");
    }

    const secretValid = await argon2.verify(record.tokenHash, parsed.secret);

    if (!secretValid) {
      await this.repository.revokeRefreshToken(record.id, now);
      throw unauthorized("AUTH_INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.");
    }

    if (record.user.status === "suspended") {
      await this.repository.revokeRefreshToken(record.id, now);
      throw forbidden("AUTH_ACCOUNT_SUSPENDED", "Your account is currently suspended.");
    }

    const tokens = await this.issueSession(record.user, context, record.id);

    await this.repository.createAuditEvent({
      action: "auth.refresh",
      actor: record.user.id,
      userId: record.user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { refreshTokenId: parsed.id },
    });

    return {
      user: record.user,
      tokens,
    };
  }

  async logout(refreshToken: string | null, context: RequestContext): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const parsed = this.parseCompositeToken(refreshToken, "AUTH_INVALID_REFRESH_TOKEN", true);

    if (!parsed) {
      return;
    }

    await this.repository.revokeRefreshToken(parsed.id, new Date());

    await this.repository.createAuditEvent({
      action: "auth.logout",
      actor: "system",
      userId: null,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { refreshTokenId: parsed.id },
    });
  }

  async requestPasswordReset(
    input: PasswordResetRequestInput,
    context: RequestContext,
  ): Promise<PasswordResetRequestResult> {
    const email = this.normalizeEmail(input.email);
    const user = await this.repository.findUserByEmail(email);

    if (!user) {
      return { requested: true };
    }

    const resetToken = this.generatePasswordResetToken();
    await this.repository.createPasswordResetToken(
      user.id,
      resetToken.token,
      resetToken.expiresAt,
    );

    await this.repository.createAuditEvent({
      action: "auth.password-reset-request",
      actor: user.id,
      userId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await this.emailService.sendPasswordResetEmail({
      user,
      resetToken: resetToken.token,
      expiresAt: resetToken.expiresAt,
    });

    return { requested: true };
  }

  async resetPassword(
    input: PasswordResetConfirmInput,
    context: RequestContext,
  ): Promise<PasswordResetResult> {
    const tokenRecord = await this.repository.consumePasswordResetToken(
      input.token,
      new Date(),
    );

    if (!tokenRecord) {
      throw badRequest("AUTH_INVALID_RESET_TOKEN", "Reset token is invalid or expired.");
    }

    if (tokenRecord.expiresAt.getTime() < Date.now()) {
      throw badRequest("AUTH_RESET_TOKEN_EXPIRED", "Reset token expired.");
    }

    const user = await this.repository.findUserById(tokenRecord.userId);

    if (!user) {
      throw badRequest("AUTH_RESET_UNKNOWN_USER", "Associated user not found for token.");
    }

    const passwordHash = await argon2.hash(input.newPassword, ARGON2_OPTIONS);
    const now = new Date();

    await this.repository.updatePasswordHash(user.id, passwordHash, now);
    await this.repository.revokeRefreshTokensForUser(user.id, now);

    await this.repository.createAuditEvent({
      action: "auth.password-reset",
      actor: user.id,
      userId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { user };
  }

  async verifyEmail(input: VerifyEmailInput, context: RequestContext): Promise<VerifyEmailResult> {
    const record = await this.repository.consumeEmailVerificationToken(input.token);

    if (!record) {
      throw badRequest("AUTH_INVALID_VERIFICATION_TOKEN", "Verification token is invalid or expired.");
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw badRequest("AUTH_EXPIRED_VERIFICATION_TOKEN", "Verification token expired.");
    }

    const user = await this.repository.markEmailVerified(record.userId, new Date());

    await this.repository.createAuditEvent({
      action: "auth.verify-email",
      actor: user.id,
      userId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { user };
  }

  private normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
  }

  private normalizeOptionalString(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private stripPassword(record: AuthUserWithSecrets): AuthUser {
    const { passwordHash, ...rest } = record;
    return rest;
  }

  private generateEmailVerificationToken() {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + this.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    return { token, expiresAt };
  }

  private generatePasswordResetToken() {
    const token = crypto.randomBytes(40).toString("base64url");
    const expiresAt = new Date(
      Date.now() + this.env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    return { token, expiresAt };
  }

  private parseCompositeToken(
    token: string,
    errorCode: string,
  ): {
    id: string;
    secret: string;
  };
  private parseCompositeToken(
    token: string,
    errorCode: string,
    tolerant: true,
  ): {
    id: string;
    secret: string;
  } | null;
  private parseCompositeToken(
    token: string,
    errorCode: string,
    tolerant?: boolean,
  ):
    | {
        id: string;
        secret: string;
      }
    | null {
    const segments = token.split(".");

    if (segments.length !== 2 || !segments[0] || !segments[1]) {
      if (tolerant) {
        return null;
      }

      throw unauthorized(errorCode, "Token format is invalid.");
    }

    return { id: segments[0], secret: segments[1] };
  }

  private async issueSession(
    user: AuthUser,
    context: RequestContext,
    previousTokenId?: string,
    rememberMe?: boolean,
  ): Promise<AuthTokens> {
    const now = new Date();
    const accessTokenExpiresAt = new Date(
      now.getTime() + this.env.ACCESS_TOKEN_TTL_SECONDS * 1000,
    );

    const defaultTtl = this.env.REFRESH_TOKEN_TTL_SECONDS;
    const refreshTtlSeconds = rememberMe
      ? defaultTtl
      : Math.min(defaultTtl, 7 * 24 * 60 * 60);

    const refreshTokenExpiresAt = new Date(now.getTime() + refreshTtlSeconds * 1000);

    const refreshTokenSecret = crypto.randomBytes(48).toString("base64url");
    const refreshTokenId = crypto.randomUUID();
    const refreshTokenValue = refreshTokenId + "." + refreshTokenSecret;
    const refreshTokenHash = await argon2.hash(refreshTokenSecret, ARGON2_OPTIONS);

    await this.repository.saveRefreshToken({
      id: refreshTokenId,
      userId: user.id,
      tokenHash: refreshTokenHash,
      issuedAt: now,
      expiresAt: refreshTokenExpiresAt,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    if (previousTokenId) {
      await this.repository.revokeRefreshToken(previousTokenId, now, refreshTokenId);
    }

    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      planTier: user.planTier,
      emailVerified: Boolean(user.emailVerifiedAt),
    };

    const accessToken = jwt.sign(accessTokenPayload, this.env.JWT_ACCESS_SECRET, {
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
      expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
    });

    return {
      accessToken,
      accessTokenExpiresAt,
      refreshToken: refreshTokenValue,
      refreshTokenExpiresAt,
    };
  }
}
