import { serverEnvSchema, type ServerEnvInput } from "./schema";
import { formatEnvErrors, readEnvValue } from "./utils";

import type { z } from "zod";

let cached: ServerEnv | undefined;

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function buildRawEnv(source: NodeJS.ProcessEnv): ServerEnvInput {
  const rawEnv = {
    NODE_ENV: readEnvValue(source, "NODE_ENV"),
    APP_ENV: readEnvValue(source, "APP_ENV") ?? readEnvValue(source, "NEXT_PUBLIC_APP_ENV"),
    API_GATEWAY_URL: readEnvValue(source, "API_GATEWAY_URL"),
    AUTH_SESSION_SECRET: readEnvValue(source, "AUTH_SESSION_SECRET"),
    DATABASE_URL: readEnvValue(source, "DATABASE_URL"),
    REDIS_URL: readEnvValue(source, "REDIS_URL"),
    POSTHOG_API_KEY: readEnvValue(source, "POSTHOG_API_KEY"),
    PLAID_CLIENT_ID: readEnvValue(source, "PLAID_CLIENT_ID"),
    PLAID_SECRET: readEnvValue(source, "PLAID_SECRET"),
    AZURE_OPENAI_API_KEY: readEnvValue(source, "AZURE_OPENAI_API_KEY"),
    AZURE_OPENAI_ENDPOINT: readEnvValue(source, "AZURE_OPENAI_ENDPOINT"),
    AWS_REGION: readEnvValue(source, "AWS_REGION"),
    AWS_SES_REGION: readEnvValue(source, "AWS_SES_REGION"),
    AWS_S3_REPORTS_BUCKET: readEnvValue(source, "AWS_S3_REPORTS_BUCKET"),
    TWILIO_ACCOUNT_SID: readEnvValue(source, "TWILIO_ACCOUNT_SID"),
    TWILIO_AUTH_TOKEN: readEnvValue(source, "TWILIO_AUTH_TOKEN"),
  };

  return rawEnv as ServerEnvInput;
}

export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = serverEnvSchema.safeParse(buildRawEnv(source));

  if (!parsed.success) {
    throw new Error(`Invalid server environment configuration:\n${formatEnvErrors(parsed.error)}`);
  }

  return parsed.data;
}

export function getServerEnv(): ServerEnv {
  cached ??= loadServerEnv();
  return cached;
}

export function resetServerEnvCache(): void {
  cached = undefined;
}
