import type { EmailService, PasswordResetEmailPayload, VerificationEmailPayload } from "../src/services/email-service";

export class RecordingEmailService implements EmailService {
  verificationEmails: VerificationEmailPayload[] = [];

  passwordResetEmails: PasswordResetEmailPayload[] = [];

  async sendVerificationEmail(payload: VerificationEmailPayload): Promise<void> {
    this.verificationEmails.push(payload);
  }

  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
    this.passwordResetEmails.push(payload);
  }

  lastVerificationToken(): string | null {
    const last = this.verificationEmails.at(-1);
    return last ? last.verificationToken : null;
  }

  lastPasswordResetToken(): string | null {
    const last = this.passwordResetEmails.at(-1);
    return last ? last.resetToken : null;
  }
}
