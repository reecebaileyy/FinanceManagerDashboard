import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { Card, CardBody, CardHeader } from '@components/dashboard/card';

import styles from './auth-section.module.css';
import controls from '../../styles/controls.module.css';
import patterns from '../../styles/patterns.module.css';

type VerificationMode = 'code' | 'backup';

const codeSchema = z.object({
  code: z
    .string({ required_error: 'Enter the 6-digit code.' })
    .regex(/^[0-9]{6}$/u, 'Codes are 6 digits.')
    .transform((value) => value.trim()),
});

const backupSchema = z.object({
  backupCode: z
    .string({ required_error: 'Enter your backup code.' })
    .min(8, 'Backup codes are at least 8 characters.'),
});

export interface TwoFactorCodePayload {
  method: 'code';
  code: string;
}

export interface TwoFactorBackupPayload {
  method: 'backup';
  backupCode: string;
}

export type TwoFactorVerificationPayload = TwoFactorCodePayload | TwoFactorBackupPayload;

interface TwoFactorErrors {
  code?: string;
  backupCode?: string;
}

type Status = 'idle' | 'success' | 'error';

export interface TwoFactorSectionProps {
  onVerify: (payload: TwoFactorVerificationPayload) => Promise<void> | void;
  onResendCode?: () => Promise<void> | void;
  onCancel?: () => void;
  username?: string;
  method?: 'email' | 'sms' | 'authenticator' | 'push';
  destination?: string;
  backupCodesRemaining?: number;
}

const METHOD_LABEL: Record<NonNullable<TwoFactorSectionProps['method']>, string> = {
  email: 'email',
  sms: 'text message',
  authenticator: 'authenticator app',
  push: 'push notification',
};

function formatDestination(method: TwoFactorSectionProps['method'], destination?: string): string {
  if (!destination) {
    return method ? METHOD_LABEL[method] : 'your default method';
  }

  if (!method || method === 'authenticator' || method === 'push') {
    return destination;
  }

  if (method === 'email') {
    const [local, domain] = destination.split('@');
    if (!local || !domain) {
      return destination;
    }
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
  }

  // sms
  const digits = destination.replace(/\D+/g, '');
  if (digits.length < 4) {
    return destination;
  }
  const visible = digits.slice(-4);
  return `***-***-${visible}`;
}

export function TwoFactorSection({
  onVerify,
  onResendCode,
  onCancel,
  username,
  method = 'authenticator',
  destination,
  backupCodesRemaining,
}: TwoFactorSectionProps) {
  const [mode, setMode] = useState<VerificationMode>('code');
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [errors, setErrors] = useState<TwoFactorErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const destinationHint = useMemo(
    () => formatDestination(method, destination),
    [method, destination],
  );
  const greeting = username?.trim() ? username : 'there';

  const resetAlerts = () => {
    setStatus('idle');
    setMessage(null);
  };

  const handleModeToggle = (nextMode: VerificationMode) => {
    if (mode === nextMode) {
      return;
    }

    resetAlerts();
    setErrors({});
    setMode(nextMode);
  };

  const handleResend = async () => {
    if (!onResendCode) {
      return;
    }

    resetAlerts();
    setIsResending(true);
    try {
      await onResendCode();
      setStatus('success');
      setMessage('A fresh code is on its way.');
    } catch (error) {
      setStatus('error');
      const text =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unable to resend the code.';
      setMessage(text);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetAlerts();

    if (mode === 'code') {
      const parsed = codeSchema.safeParse({ code });
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        setErrors({ code: issue?.message ?? 'Enter the six digit code.' });
        setStatus('error');
        setMessage('Double-check the code from your device.');
        return;
      }

      setErrors({});
      setIsSubmitting(true);
      try {
        await onVerify({ method: 'code', code: parsed.data.code });
        setStatus('success');
        setMessage("Success! You're verified.");
      } catch (error) {
        setStatus('error');
        const text =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "That code didn't work. Try again.";
        setMessage(text);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const parsed = backupSchema.safeParse({ backupCode });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setErrors({ backupCode: issue?.message ?? 'Enter a valid backup code.' });
      setStatus('error');
      setMessage("We couldn't verify that backup code.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onVerify({ method: 'backup', backupCode: parsed.data.backupCode });
      setStatus('success');
      setMessage("Backup code accepted. You're signed in.");
    } catch (error) {
      setStatus('error');
      const text =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'That backup code was invalid.';
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const alertClassName = message
    ? [styles.formAlert, status === 'success' ? styles.formAlertSuccess : styles.formAlertError]
        .filter(Boolean)
        .join(' ')
    : undefined;

  return (
    <section id="two-factor" className={styles.section}>
      <div className={`${patterns.grid} ${patterns.gridCols2}`}>
        <Card>
          <CardHeader
            title="Two-factor authentication"
            subtitle={`Great to see you, ${greeting}`}
          />
          <CardBody>
            <form className={patterns.form} onSubmit={handleSubmit} noValidate>
              {message ? <p className={alertClassName}>{message}</p> : null}
              <p className={styles.helperText}>
                Enter the {mode === 'code' ? '6-digit' : 'one-time backup'} code from your{' '}
                {METHOD_LABEL[method] ?? 'authenticator'}
                {destination ? ` (${destinationHint})` : null}.
              </p>
              {mode === 'code' ? (
                <div>
                  <label className={patterns.formLabel} htmlFor="two-factor-code">
                    Authentication code
                    <input
                      id="two-factor-code"
                      name="code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="000000"
                      value={code}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const next = event.target.value.replace(/\D+/g, '').slice(0, 6);
                        setCode(next);
                        if (errors.code) {
                          const parsed = codeSchema.safeParse({ code: next });
                          setErrors((previous) => {
                            const nextErrors = { ...previous };
                            if (parsed.success) {
                              delete nextErrors.code;
                            } else {
                              const issue = parsed.error.issues[0];
                              if (issue) {
                                nextErrors.code = issue.message;
                              }
                            }
                            return nextErrors;
                          });
                        }
                      }}
                      className={styles.codeInput}
                      aria-invalid={Boolean(errors.code)}
                      autoComplete="one-time-code"
                      required
                    />
                    {errors.code ? <span className={styles.fieldError}>{errors.code}</span> : null}
                  </label>
                  <div className={styles.backupActions}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => handleModeToggle('backup')}
                    >
                      Use a backup code instead
                    </button>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={handleResend}
                      disabled={isResending || !onResendCode}
                    >
                      {isResending ? 'Resending...' : 'Resend code'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className={patterns.formLabel} htmlFor="two-factor-backup">
                    Backup code
                    <input
                      id="two-factor-backup"
                      name="backupCode"
                      placeholder="XXXX-XXXX"
                      value={backupCode}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const next = event.target.value.toUpperCase().slice(0, 20);
                        setBackupCode(next);
                        if (errors.backupCode) {
                          const parsed = backupSchema.safeParse({ backupCode: next });
                          setErrors((previous) => {
                            const nextErrors = { ...previous };
                            if (parsed.success) {
                              delete nextErrors.backupCode;
                            } else {
                              const issue = parsed.error.issues[0];
                              if (issue) {
                                nextErrors.backupCode = issue.message;
                              }
                            }
                            return nextErrors;
                          });
                        }
                      }}
                      className={patterns.input}
                      aria-invalid={Boolean(errors.backupCode)}
                      autoComplete="one-time-code"
                      required
                    />
                    {errors.backupCode ? (
                      <span className={styles.fieldError}>{errors.backupCode}</span>
                    ) : null}
                  </label>
                  <div className={styles.backupActions}>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => handleModeToggle('code')}
                    >
                      Use a 6-digit code instead
                    </button>
                    {typeof backupCodesRemaining === 'number' ? (
                      <span className={styles.backupHint}>
                        {backupCodesRemaining} backup codes left
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
              <div className={styles.formActions}>
                {onCancel ? (
                  <button type="button" className={controls.button} onClick={onCancel}>
                    Cancel
                  </button>
                ) : null}
                <button
                  type="submit"
                  className={`${controls.button} ${controls.buttonPrimary}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Keep your account secure" />
          <CardBody>
            <ul className={styles.infoList}>
              <li>
                Codes rotate every 30 seconds. If one fails, wait for the next before retrying.
              </li>
              <li>Backup codes are single-use. Generate new ones after you sign in.</li>
              <li>We&apos;ll alert you if there are multiple failed attempts on your account.</li>
              <li>You can manage trusted devices and 2FA methods in Settings.</li>
            </ul>
            <p className={styles.helperText}>
              Lost your device? Contact security@financemanager.app for emergency recovery.
            </p>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
