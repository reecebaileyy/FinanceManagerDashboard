#!/usr/bin/env node
import { loadEnvConfig } from "@next/env";
import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]);
const appEnvSchema = z.enum(["local", "staging", "production"]);

const postgresUrlSchema = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL must start with postgres:// or postgresql://",
  );

const redisUrlSchema = z
  .string()
  .min(1, "REDIS_URL is required")
  .refine(
    (value) => value.startsWith("redis://") || value.startsWith("rediss://"),
    "REDIS_URL must start with redis:// or rediss://",
  );

const urlSchema = z.string().url();

const serverEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema.default("development"),
    APP_ENV: appEnvSchema.default("local"),
    API_GATEWAY_URL: urlSchema,
    AUTH_SESSION_SECRET: z
      .string()
      .min(32, "AUTH_SESSION_SECRET must be at least 32 characters long"),
    DATABASE_URL: postgresUrlSchema,
    REDIS_URL: redisUrlSchema,
    POSTHOG_API_KEY: z.string().min(1).optional(),
    PLAID_CLIENT_ID: z.string().min(1).optional(),
    PLAID_SECRET: z.string().min(1).optional(),
    AZURE_OPENAI_API_KEY: z.string().min(1).optional(),
    AZURE_OPENAI_ENDPOINT: urlSchema.optional(),
    AWS_REGION: z.string().min(1).optional(),
    AWS_SES_REGION: z.string().min(1).optional(),
    AWS_S3_REPORTS_BUCKET: z.string().min(1).optional(),
    TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "local") {
      return;
    }

    [
      ["PLAID_CLIENT_ID", env.PLAID_CLIENT_ID],
      ["PLAID_SECRET", env.PLAID_SECRET],
      ["AZURE_OPENAI_API_KEY", env.AZURE_OPENAI_API_KEY],
      ["AZURE_OPENAI_ENDPOINT", env.AZURE_OPENAI_ENDPOINT],
      ["AWS_REGION", env.AWS_REGION],
      ["AWS_SES_REGION", env.AWS_SES_REGION],
      ["AWS_S3_REPORTS_BUCKET", env.AWS_S3_REPORTS_BUCKET],
      ["TWILIO_ACCOUNT_SID", env.TWILIO_ACCOUNT_SID],
      ["TWILIO_AUTH_TOKEN", env.TWILIO_AUTH_TOKEN],
    ].forEach(([key, value]) => {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when APP_ENV is ${env.APP_ENV}`,
        });
      }
    });
  });

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: appEnvSchema.default("local"),
  NEXT_PUBLIC_API_BASE_URL: urlSchema,
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: urlSchema.optional(),
  NEXT_PUBLIC_SENTRY_DSN: urlSchema.optional(),
});

const read = (key) => {
  const value = process.env[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const formatErrors = (error) => {
  const flattened = error.flatten();
  const messages = [];

  for (const [field, issues] of Object.entries(flattened.fieldErrors)) {
    if (!issues || issues.length === 0) {
      continue;
    }
    issues.forEach((message) => messages.push(`${field}: ${message}`));
  }

  flattened.formErrors.forEach((message) => messages.push(message));

  return messages.join("\n");
};

const run = () => {
  loadEnvConfig(process.cwd());

  const server = serverEnvSchema.safeParse({
    NODE_ENV: read("NODE_ENV"),
    APP_ENV: read("APP_ENV") ?? read("NEXT_PUBLIC_APP_ENV"),
    API_GATEWAY_URL: read("API_GATEWAY_URL"),
    AUTH_SESSION_SECRET: read("AUTH_SESSION_SECRET"),
    DATABASE_URL: read("DATABASE_URL"),
    REDIS_URL: read("REDIS_URL"),
    POSTHOG_API_KEY: read("POSTHOG_API_KEY"),
    PLAID_CLIENT_ID: read("PLAID_CLIENT_ID"),
    PLAID_SECRET: read("PLAID_SECRET"),
    AZURE_OPENAI_API_KEY: read("AZURE_OPENAI_API_KEY"),
    AZURE_OPENAI_ENDPOINT: read("AZURE_OPENAI_ENDPOINT"),
    AWS_REGION: read("AWS_REGION"),
    AWS_SES_REGION: read("AWS_SES_REGION"),
    AWS_S3_REPORTS_BUCKET: read("AWS_S3_REPORTS_BUCKET"),
    TWILIO_ACCOUNT_SID: read("TWILIO_ACCOUNT_SID"),
    TWILIO_AUTH_TOKEN: read("TWILIO_AUTH_TOKEN"),
  });

  if (!server.success) {
    throw new Error(`Server environment validation failed:\n${formatErrors(server.error)}`);
  }

  const client = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_ENV: read("NEXT_PUBLIC_APP_ENV") ?? read("APP_ENV"),
    NEXT_PUBLIC_API_BASE_URL: read("NEXT_PUBLIC_API_BASE_URL"),
    NEXT_PUBLIC_POSTHOG_KEY: read("NEXT_PUBLIC_POSTHOG_KEY"),
    NEXT_PUBLIC_POSTHOG_HOST: read("NEXT_PUBLIC_POSTHOG_HOST"),
    NEXT_PUBLIC_SENTRY_DSN: read("NEXT_PUBLIC_SENTRY_DSN"),
  });

  if (!client.success) {
    throw new Error(`Client environment validation failed:\n${formatErrors(client.error)}`);
  }

  if (server.data.APP_ENV !== client.data.NEXT_PUBLIC_APP_ENV) {
    throw new Error(
      `APP_ENV (${server.data.APP_ENV}) and NEXT_PUBLIC_APP_ENV (${client.data.NEXT_PUBLIC_APP_ENV}) must match.`,
    );
  }

  console.log(
    `[env] ${server.data.APP_ENV} configuration loaded (NODE_ENV=${server.data.NODE_ENV})`,
  );

  if (!client.data.NEXT_PUBLIC_POSTHOG_KEY) {
    console.warn("[env] NEXT_PUBLIC_POSTHOG_KEY is not set; analytics will be disabled.");
  }
};

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
