import { useMemo, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";

import styles from "./auth-section.module.css";
import controls from "../../styles/controls.module.css";
import patterns from "../../styles/patterns.module.css";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string({ message: "Email is required." })
    .email("Enter a valid email address."),
  password: z
    .string({ message: "Password is required." })
    .min(8, "Password must be at least 8 characters long.")
    .max(128, "Password cannot be longer than 128 characters."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

type Status = "idle" | "success" | "error";

export interface LoginSectionProps {
  onLogin: (values: LoginFormValues) => Promise<void> | void;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
  defaultEmail?: string;
}

function resolveDisplayName(email: string): string {
  const [rawName] = email.split("@");

  if (!rawName) {
    return "Finance Manager user";
  }

  return rawName
    .split(/[._-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function mapZodErrors(issues: z.ZodIssue[]): LoginFormErrors {
  const result: LoginFormErrors = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key as keyof LoginFormValues]) {
      result[key as keyof LoginFormValues] = issue.message;
    }
  }

  return result;
}

function getSubmissionMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "We could not verify those credentials. Please try again.";
}

export function LoginSection({
  onLogin,
  onCreateAccount,
  onForgotPassword,
  defaultEmail = "",
}: LoginSectionProps) {
  const [values, setValues] = useState<LoginFormValues>({ email: defaultEmail, password: "" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const friendlyName = useMemo(() => resolveDisplayName(values.email), [values.email]);

  const handleChange = (field: keyof LoginFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));

    if (errors[field]) {
      const validationResult = loginSchema.shape[field].safeParse(value);

      setErrors((previous) => {
        const next = { ...previous };

        if (validationResult.success) {
          delete next[field];
        } else {
          const issue = validationResult.error.issues[0];
          if (issue) {
            next[field] = issue.message;
          }
        }

        return next;
      });
    }
  };

  const handleBlur = (field: keyof LoginFormValues) => (event: FocusEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const validationResult = loginSchema.shape[field].safeParse(value);

    setErrors((previous) => {
      const next = { ...previous };

      if (validationResult.success) {
        delete next[field];
      } else {
        const issue = validationResult.error.issues[0];
        if (issue) {
          next[field] = issue.message;
        }
      }

      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error.issues));
      setStatus("error");
      setMessage("Review the highlighted fields and try again.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await onLogin(parsed.data);
      setStatus("success");
      setMessage(`Welcome back, ${resolveDisplayName(parsed.data.email)}. Redirecting to your dashboard...`);
      setValues((previous) => ({ ...previous, password: "" }));
    } catch (error) {
      setStatus("error");
      setMessage(getSubmissionMessage(error));
      setValues((previous) => ({ ...previous, password: "" }));
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
    <section id="login" className={styles.section}>
      <div className={`${patterns.grid} ${patterns.gridCols2}`}>
        <Card>
          <CardHeader title="Login" badge="welcome back" />
          <CardBody>
            <form className={patterns.form} onSubmit={handleSubmit} noValidate>
              {message ? <p className={alertClassName}>{message}</p> : null}
              <label className={patterns.formLabel} htmlFor="login-email">
                Email
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className={patterns.input}
                  value={values.email}
                  onChange={handleChange("email")}
                  onBlur={handleBlur("email")}
                  autoComplete="email"
                  required
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? <span className={styles.fieldError}>{errors.email}</span> : null}
              </label>
              <label className={patterns.formLabel} htmlFor="login-password">
                Password
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="********"
                  className={patterns.input}
                  value={values.password}
                  onChange={handleChange("password")}
                  onBlur={handleBlur("password")}
                  autoComplete="current-password"
                  required
                  aria-invalid={Boolean(errors.password)}
                />
                {errors.password ? <span className={styles.fieldError}>{errors.password}</span> : null}
              </label>
              <div className={styles.secondaryActions}>
                <button type="button" className={styles.linkButton} onClick={onForgotPassword}>
                  Forgot password?
                </button>
                <span className={styles.helperText}>Multi-factor authentication is required for sensitive actions.</span>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={controls.button} onClick={onCreateAccount}>
                  Create account
                </button>
                <button
                  type="submit"
                  className={`${controls.button} ${controls.buttonPrimary}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Security" subtitle="Your account protections" />
          <CardBody>
            <p className={styles.helperText}>
              We use Argon2 password hashing, device-based session tracking, and per-session anomaly detection to keep
              your account safe.
            </p>
            <ul className={styles.infoList}>
              <li>Automatic lockouts after repeated failed attempts</li>
              <li>Two-factor authentication prompts on high-risk activity</li>
              <li>Session timeout after 15 minutes of inactivity</li>
              <li>Login history with device fingerprinting in Settings</li>
            </ul>
            <p className={styles.helperText}>
              Need help? Contact support and reference the email {friendlyName || "on file"} used for login.
            </p>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
