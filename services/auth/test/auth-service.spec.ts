import { describe, it, expect, beforeEach, vi } from "vitest";

import { createAuthServiceForTest } from "./helpers";

function extractRefreshId(token: string) {
  return token.split(".")[0];
}

describe("AuthService", () => {
  const password = "Sup3rSecurePass!";

  beforeEach(() => {
    vi.useRealTimers();
  });

  it("signs up a user and issues session tokens", async () => {
    const { service, repository, emailService, env } = createAuthServiceForTest();

    const result = await service.signup(
      {
        email: "casey@example.com",
        password,
        firstName: "Casey",
        lastName: "Patel",
        acceptTerms: true,
        marketingOptIn: true,
      },
      { ipAddress: "127.0.0.1", userAgent: "vitest" },
    );

    expect(result.user.email).toBe("casey@example.com");
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(result.requiresEmailVerification).toBe(true);
    expect(result.debug?.emailVerificationToken).toBeTruthy();
    expect(emailService.verificationEmails).toHaveLength(1);

    const stored = await repository.findUserByEmail("casey@example.com");
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe(password);
    expect(result.tokens.accessTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.tokens.refreshTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(env.isProduction).toBe(false);
  });

  it("logs in and updates lastLoginAt", async () => {
    const { service, repository } = createAuthServiceForTest();

    await service.signup(
      {
        email: "test@example.com",
        password,
        acceptTerms: true,
      },
      { ipAddress: "1.1.1.1", userAgent: "signup" },
    );

    const result = await service.login(
      {
        email: "test@example.com",
        password,
        rememberMe: false,
      },
      { ipAddress: "2.2.2.2", userAgent: "login" },
    );

    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(result.emailVerified).toBe(false);

    const stored = await repository.findUserByEmail("test@example.com");
    expect(stored?.lastLoginAt).toBeTruthy();
  });

  it("refreshes a session and revokes the previous refresh token", async () => {
    const { service, repository } = createAuthServiceForTest();

    const signup = await service.signup(
      {
        email: "refresh@example.com",
        password,
        acceptTerms: true,
      },
      { ipAddress: "1.1.1.1", userAgent: "signup" },
    );

    const originalTokens = signup.tokens;
    const originalId = extractRefreshId(originalTokens.refreshToken);

    const refreshed = await service.refreshSession(
      originalTokens.refreshToken,
      { ipAddress: "1.1.1.1", userAgent: "refresh" },
    );

    expect(refreshed.tokens.refreshToken).not.toBe(originalTokens.refreshToken);

    const oldTokenRecord = await repository.findRefreshTokenById(originalId);
    expect(oldTokenRecord?.revokedAt).toBeTruthy();

    const newId = extractRefreshId(refreshed.tokens.refreshToken);
    const newTokenRecord = await repository.findRefreshTokenById(newId);
    expect(newTokenRecord?.revokedAt).toBeNull();
  });

  it("supports password reset flow", async () => {
    const { service, repository, emailService } = createAuthServiceForTest();

    await service.signup(
      {
        email: "reset@example.com",
        password,
        acceptTerms: true,
      },
      { ipAddress: "1.1.1.1", userAgent: "signup" },
    );

    await service.login(
      {
        email: "reset@example.com",
        password,
      },
      { ipAddress: "2.2.2.2", userAgent: "login" },
    );

    await service.requestPasswordReset(
      { email: "reset@example.com" },
      { ipAddress: "3.3.3.3", userAgent: "reset-request" },
    );

    expect(emailService.passwordResetEmails).toHaveLength(1);
    const resetToken = emailService.lastPasswordResetToken();
    expect(resetToken).toBeTruthy();

    await service.resetPassword(
      {
        token: resetToken!,
        newPassword: "Diff3rentPass!",
      },
      { ipAddress: "3.3.3.3", userAgent: "reset" },
    );

    const loginAfterReset = await service.login(
      {
        email: "reset@example.com",
        password: "Diff3rentPass!",
      },
      { ipAddress: "4.4.4.4", userAgent: "login-after-reset" },
    );

    expect(loginAfterReset.tokens.accessToken).toBeTruthy();

    const tokens = await repository.findRefreshTokenById(extractRefreshId(loginAfterReset.tokens.refreshToken));
    expect(tokens).not.toBeNull();
  });

  it("verifies email using token", async () => {
    const { service, emailService } = createAuthServiceForTest();

    const signup = await service.signup(
      {
        email: "verify@example.com",
        password,
        acceptTerms: true,
      },
      { ipAddress: "5.5.5.5", userAgent: "signup" },
    );

    const token = signup.debug?.emailVerificationToken ?? emailService.lastVerificationToken();
    expect(token).toBeTruthy();

    const result = await service.verifyEmail(
      { token: token! },
      { ipAddress: "5.5.5.5", userAgent: "verify" },
    );

    expect(result.user.emailVerifiedAt).toBeTruthy();
  });
});
