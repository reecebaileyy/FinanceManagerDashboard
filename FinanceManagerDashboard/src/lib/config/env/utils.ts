import type { ZodError } from "zod";

export function formatEnvErrors(error: ZodError): string {
  const { fieldErrors, formErrors } = error.flatten();
  const messages: string[] = [];

  for (const [field, issues] of Object.entries(fieldErrors)) {
    if (!Array.isArray(issues) || issues.length === 0) {
      continue;
    }

    for (const message of issues) {
      messages.push(`${field}: ${message}`);
    }
  }

  for (const message of formErrors) {
    messages.push(message);
  }

  return messages.join("\n");
}

export function readEnvValue(source: NodeJS.ProcessEnv, key: string): string | undefined {
  const raw = source[key];
  if (typeof raw !== "string") {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
