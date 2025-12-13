import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";

import styles from "./auth-section.module.css";
import controls from "../../styles/controls.module.css";
import patterns from "../../styles/patterns.module.css";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .email("Enter the email associated with your account."),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

type ForgotPasswordErrors = Partial<Record<keyof ForgotPasswordFormValues, string>>;

type Status = "idle" | "success" | "error";

export interface ForgotPasswordSectionProps {
  onSubmit: (values: ForgotPasswordFormValues) => Promise<void> | void;
  onBackToLogin: () => void;
}

function maskedEmail(email: string): string {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(localPart.length - 2, 3))}@${domain}`;
}

function getMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "We could not start the reset process. Please try again.";
}

export function ForgotPasswordSection({ onSubmit, onBackToLogin }: ForgotPasswordSectionProps) {
  const [values, setValues] = useState<ForgotPasswordFormValues>({ email: "" });
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setValues({ email: value });

    if (errors.email) {
      const validation = forgotPasswordSchema.shape.email.safeParse(value);
      setErrors((previous) => {
        const next = { ...previous };
        if (validation.success) {
          delete next.email;
        } else {
          const issue = validation.error.issues[0];
          if (issue) {
            next.email = issue.message;
          }
        }
        return next;
      });
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const validation = forgotPasswordSchema.shape.email.safeParse(value);

    setErrors((previous) => {
      const next = { ...previous };

      if (validation.success) {
        delete next.email;
      } else {
        const issue = validation.error.issues[0];
        if (issue) {
          next.email = issue.message;
        }
      }

      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    const parsed = forgotPasswordSchema.safeParse(values);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setErrors({ email: issue?.message ?? "Enter a valid email." });
      setStatus("error");
      setMessage("Please confirm the email address and try again.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await onSubmit(parsed.data);
      setStatus("success");
      setMessage(`If an account exists for ${maskedEmail(parsed.data.email)}, a reset link is on its way.`);
    } catch (error) {
      setStatus("error");
      setMessage(getMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const alertClassName = message
    ? [styles.formAlert, status === "success" ? styles.formAlertSuccess : styles.formAlertError]
        .filter(Boolean)
        .join(" ")
    : undefined;

  return (
    <section id="forgot-password" className={styles.section}>
      <div className={`${patterns.grid} ${patterns.gridCols2}`}>
        <Card>
          <CardHeader title="Reset your password" subtitle="We\'ll send a secure link" />
          <CardBody>
            <form className={patterns.form} onSubmit={handleSubmit} noValidate>
              {message ? <p className={alertClassName}>{message}</p> : null}
              <label className={patterns.formLabel} htmlFor="forgot-email">
                Email address
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  className={patterns.input}
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? <span className={styles.fieldError}>{errors.email}</span> : null}
              </label>
              <p className={styles.helperText}>
                We\'ll email you a link to create a new password. The link expires in 15 minutes for your security.
              </p>
              <div className={styles.formActions}>
                <button type="button" className={controls.button} onClick={onBackToLogin}>
                  Back to login
                </button>
                <button
                  type="submit"
                  className={`${controls.button} ${controls.buttonPrimary}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending reset link..." : "Send reset link"}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="What happens next" />
          <CardBody>
            <ul className={styles.infoList}>
              <li>Check your inbox (and spam folder) for a message from security@financemanager.app.</li>
              <li>Click the secure link to choose a new password that meets our requirements.</li>
              <li>For extra safety, you\'ll be asked to complete two-factor authentication afterward.</li>
              <li>If you didn\'t request this, reset your password and contact support immediately.</li>
            </ul>
            <p className={styles.helperText}>
              Still need help? Reach us at support@financemanager.app and we\'ll walk through account recovery.
            </p>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
