import type { AuthUser } from "../domain/models";

export interface VerificationEmailPayload {
  user: AuthUser;
  verificationToken: string;
  expiresAt: Date;
}

export interface PasswordResetEmailPayload {
  user: AuthUser;
  resetToken: string;
  expiresAt: Date;
}

export interface EmailService {
  sendVerificationEmail(payload: VerificationEmailPayload): Promise<void>;
  sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void>;
}

export class ConsoleEmailService implements EmailService {
  // eslint-disable-next-line class-methods-use-this, no-console
  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
    console.info("[email] send verification", {
      userId: payload.user.id,
      email: payload.user.email,
      token: payload.verificationToken,
      expiresAt: payload.expiresAt.toISOString(),
    });
  }

  // eslint-disable-next-line class-methods-use-this, no-console
  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
    console.info("[email] send password reset", {
      userId: payload.user.id,
      email: payload.user.email,
      token: payload.resetToken,
      expiresAt: payload.expiresAt.toISOString(),
    });
  }
}
