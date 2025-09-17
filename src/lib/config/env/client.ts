import { clientEnvSchema, type ClientEnvInput } from "./schema";
import { formatEnvErrors, readEnvValue } from "./utils";

import type { z } from "zod";

let cached: ClientEnv | undefined;

export type ClientEnv = z.infer<typeof clientEnvSchema>;

function coerceRuntimeValue(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildClientEnv(source?: NodeJS.ProcessEnv): ClientEnvInput {
  if (source) {
    const rawEnv = {
      NEXT_PUBLIC_APP_ENV:
        readEnvValue(source, "NEXT_PUBLIC_APP_ENV") ?? readEnvValue(source, "APP_ENV"),
      NEXT_PUBLIC_API_BASE_URL:
        readEnvValue(source, "NEXT_PUBLIC_API_BASE_URL") ?? "http://localhost:3000/api",
      NEXT_PUBLIC_POSTHOG_KEY: readEnvValue(source, "NEXT_PUBLIC_POSTHOG_KEY"),
      NEXT_PUBLIC_POSTHOG_HOST: readEnvValue(source, "NEXT_PUBLIC_POSTHOG_HOST"),
      NEXT_PUBLIC_SENTRY_DSN: readEnvValue(source, "NEXT_PUBLIC_SENTRY_DSN"),
    };

    return rawEnv as ClientEnvInput;
  }

  const rawEnv = {
    NEXT_PUBLIC_APP_ENV:
      coerceRuntimeValue(process.env.NEXT_PUBLIC_APP_ENV) ??
      coerceRuntimeValue(process.env.APP_ENV),
    NEXT_PUBLIC_API_BASE_URL:
      coerceRuntimeValue(process.env.NEXT_PUBLIC_API_BASE_URL) ?? "http://localhost:3000/api",
    NEXT_PUBLIC_POSTHOG_KEY: coerceRuntimeValue(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    NEXT_PUBLIC_POSTHOG_HOST: coerceRuntimeValue(process.env.NEXT_PUBLIC_POSTHOG_HOST),
    NEXT_PUBLIC_SENTRY_DSN: coerceRuntimeValue(process.env.NEXT_PUBLIC_SENTRY_DSN),
  };

  return rawEnv as ClientEnvInput;
}

export function loadClientEnv(source?: NodeJS.ProcessEnv): ClientEnv {
  const parsed = clientEnvSchema.safeParse(buildClientEnv(source));

  if (!parsed.success) {
    throw new Error(`Invalid client environment configuration:\n${formatEnvErrors(parsed.error)}`);
  }

  return parsed.data;
}

export function getClientEnv(): ClientEnv {
  cached ??= loadClientEnv();
  return cached;
}

export function resetClientEnvCache(): void {
  cached = undefined;
}
