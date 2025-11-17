import { useMemo, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";

import styles from "./auth-section.module.css";
import controls from "../../styles/controls.module.css";
import patterns from "../../styles/patterns.module.css";
import { z } from "zod";

const passwordSchema = z
  .string({ message: "Password is required." })
  .min(12, "Use at least 12 characters for stronger security.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[a-z]/, "Include at least one lowercase letter.")
  .regex(/\d/, "Include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Include at least one special character.");

const signupSchema = z
  .object({
    fullName: z
      .string({ message: "Full name is required." })
      .min(2, "Enter your full name.")
      .max(80, "Name cannot exceed 80 characters."),
    email: z
      .string({ message: "Email is required." })
      .email("Enter a valid email address."),
    password: passwordSchema,
    confirmPassword: z.string({ message: "Confirm your password." }),
    role: z.enum(["user", "admin"], { message: "Select a role." }),
    acceptTerms: z.boolean(),
  })
  .superRefine((data, context) => {
    if (!data.acceptTerms) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "You must accept the terms of use to continue.",
        path: ["acceptTerms"],
      });
    }

    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

type SignupFormErrors = Partial<Record<keyof SignupFormValues, string>>;

type Status = "idle" | "success" | "error";

export interface SignupSectionProps {
  onCreateAccount: (values: SignupFormValues) => Promise<void> | void;
  onCancel: () => void;
}

function firstNameFrom(fullName: string): string {
  if (!fullName.trim()) {
    return "there";
  }

  const [first, second] = fullName.trim().split(/\s+/);
  return first ?? second ?? "there";
}

function mapErrors(issues: z.ZodIssue[]): SignupFormErrors {
  const result: SignupFormErrors = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key as keyof SignupFormValues]) {
      result[key as keyof SignupFormValues] = issue.message;
    }
  }

  return result;
}

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "We could not complete your registration. Try again in a few moments.";
}

export function SignupSection({ onCreateAccount, onCancel }: SignupSectionProps) {
  const [values, setValues] = useState<SignupFormValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const friendlyName = useMemo(() => firstNameFrom(values.fullName), [values.fullName]);

  const updateField = (field: keyof SignupFormValues, value: string | boolean) => {
    setValues((previous) => {
      const nextValues = { ...previous, [field]: value };

      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors };
        const fieldSchema = signupSchema.shape[field];

        if (fieldSchema) {
          const result = fieldSchema.safeParse(value);

          if (result.success) {
            delete nextErrors[field];
          } else {
            const issue = result.error.issues[0];
            if (issue) {
              nextErrors[field] = issue.message;
            }
          }
        }

        if (field === "password" || field === "confirmPassword") {
          if (nextValues.password && nextValues.confirmPassword && nextValues.password !== nextValues.confirmPassword) {
            nextErrors.confirmPassword = "Passwords do not match.";
          } else if (nextValues.confirmPassword) {
            delete nextErrors.confirmPassword;
          }
        }

        if (field === "acceptTerms" && nextValues.acceptTerms) {
          delete nextErrors.acceptTerms;
        }

        return nextErrors;
      });

      return nextValues;
    });
  };

  const handleInputChange = (field: keyof SignupFormValues) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const input = event.target;
    const value = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value;
    updateField(field, value);
  };

  const handleBlur = (field: keyof SignupFormValues) => (
    event: FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const input = event.target;
    const value = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value;
    const fieldSchema = signupSchema.shape[field];
    const nextValues = { ...values, [field]: value } as SignupFormValues;

    setErrors((previous) => {
      const next = { ...previous };

      if (fieldSchema) {
        const result = fieldSchema.safeParse(value);

        if (result.success) {
          delete next[field];
        } else {
          const issue = result.error.issues[0];
          if (issue) {
            next[field] = issue.message;
          }
        }
      }

      if (field === "password" || field === "confirmPassword") {
        if (nextValues.password && nextValues.confirmPassword && nextValues.password !== nextValues.confirmPassword) {
          next.confirmPassword = "Passwords do not match.";
        } else if (nextValues.confirmPassword) {
          delete next.confirmPassword;
        }
      }

      if (field === "acceptTerms" && nextValues.acceptTerms) {
        delete next.acceptTerms;
      }

      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    const parsed = signupSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(mapErrors(parsed.error.issues));
      setStatus("error");
      setMessage("Let\'s tidy up the highlighted fields and try again.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await onCreateAccount(parsed.data);
      setStatus("success");
      setMessage(`Welcome aboard, ${firstNameFrom(parsed.data.fullName)}! Check your inbox to verify your account.`);
      setValues((previous) => ({
        ...previous,
        password: "",
        confirmPassword: "",
      }));
    } catch (error) {
      setStatus("error");
      setMessage(messageFrom(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const alertClassName = message
    ? [
        styles.formAlert,
        status === "success" ? styles.formAlertSuccess : status === "error" ? styles.formAlertError : styles.formAlertInfo,
      ]
        .filter(Boolean)
        .join(" ")
    : undefined;

  return (
    <section id="signup" className={styles.section}>
      <div className={`${patterns.grid} ${patterns.gridCols2}`}>
        <Card>
          <CardHeader title="Create Account" badge="free" />
          <CardBody>
            <form className={patterns.form} onSubmit={handleSubmit} noValidate>
              {message ? <p className={alertClassName}>{message}</p> : null}
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="signup-full-name">
                  Full name
                  <input
                    id="signup-full-name"
                    name="fullName"
                    className={patterns.input}
                    placeholder="First Last"
                    value={values.fullName}
                    onChange={handleInputChange("fullName")}
                    onBlur={handleBlur("fullName")}
                    autoComplete="name"
                    required
                    aria-invalid={Boolean(errors.fullName)}
                  />
                  {errors.fullName ? <span className={styles.fieldError}>{errors.fullName}</span> : null}
                </label>
                <label className={patterns.formLabel} htmlFor="signup-email">
                  Email
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    className={patterns.input}
                    placeholder="alex@example.com"
                    value={values.email}
                    onChange={handleInputChange("email")}
                    onBlur={handleBlur("email")}
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email ? <span className={styles.fieldError}>{errors.email}</span> : null}
                </label>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="signup-password">
                  Password
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    className={patterns.input}
                    placeholder="Create a strong password"
                    value={values.password}
                    onChange={handleInputChange("password")}
                    onBlur={handleBlur("password")}
                    autoComplete="new-password"
                    required
                    aria-invalid={Boolean(errors.password)}
                  />
                  {errors.password ? <span className={styles.fieldError}>{errors.password}</span> : null}
                </label>
                <label className={patterns.formLabel} htmlFor="signup-confirm-password">
                  Confirm password
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    className={patterns.input}
                    placeholder="Repeat password"
                    value={values.confirmPassword}
                    onChange={handleInputChange("confirmPassword")}
                    onBlur={handleBlur("confirmPassword")}
                    autoComplete="new-password"
                    required
                    aria-invalid={Boolean(errors.confirmPassword)}
                  />
                  {errors.confirmPassword ? <span className={styles.fieldError}>{errors.confirmPassword}</span> : null}
                </label>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="signup-role">
                  Role
                  <select
                    id="signup-role"
                    name="role"
                    className={patterns.select}
                    value={values.role}
                    onChange={handleInputChange("role")}
                    onBlur={handleBlur("role")}
                    aria-invalid={Boolean(errors.role)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {errors.role ? <span className={styles.fieldError}>{errors.role}</span> : null}
                </label>
              </div>
              <label className={styles.checkboxRow} htmlFor="signup-terms">
                <input
                  id="signup-terms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={values.acceptTerms}
                  onChange={handleInputChange("acceptTerms")}
                  onBlur={handleBlur("acceptTerms")}
                  aria-invalid={Boolean(errors.acceptTerms)}
                />
                <span>
                  I agree to the Finance Manager Terms of Use, Privacy Policy, and consent to receive critical account
                  communications.
                  {errors.acceptTerms ? <span className={styles.fieldError}>{errors.acceptTerms}</span> : null}
                </span>
              </label>
              <div className={styles.formActions}>
                <button type="button" className={controls.button} onClick={onCancel}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${controls.button} ${controls.buttonPrimary}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Why we ask for this" subtitle="Security-first onboarding" />
          <CardBody>
            <p className={styles.helperText}>
              We onboard every member with security best practices enabled by default. Strong passwords and account
              roles protect finances from day one.
            </p>
            <ul className={styles.infoList}>
              <li>Password manager friendly with copy-to-clipboard shortcuts</li>
              <li>Automatic email verification and device fingerprinting</li>
              <li>Admin accounts require two-factor authentication on every login</li>
              <li>Personalised onboarding checklist tailored for {friendlyName}</li>
            </ul>
            <p className={styles.helperText}>
              Need a custom onboarding for your organisation? Reach out to success@financemanager.app.
            </p>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
