import { z } from 'zod';

export const nodeEnvSchema = z.enum(['development', 'test', 'production']);
export const appEnvSchema = z.enum(['local', 'staging', 'production']);

const postgresUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL is required')
  .refine(
    (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    'DATABASE_URL must start with postgres:// or postgresql://',
  );

const redisUrlSchema = z
  .string()
  .min(1, 'REDIS_URL is required')
  .refine(
    (value) => value.startsWith('redis://') || value.startsWith('rediss://'),
    'REDIS_URL must start with redis:// or rediss://',
  );

const urlSchema = z.string().url();

export const serverEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema.default('development'),
    APP_ENV: appEnvSchema.default('local'),
    API_GATEWAY_URL: urlSchema,
    AUTH_SESSION_SECRET: z
      .string()
      .min(32, 'AUTH_SESSION_SECRET must be at least 32 characters long'),
    DATABASE_URL: postgresUrlSchema,
    REDIS_URL: redisUrlSchema,
    POSTHOG_API_KEY: z.string().min(1).optional(),
    PLAID_CLIENT_ID: z.string().min(1).optional(),
    PLAID_SECRET: z.string().min(1).optional(),
    AZURE_OPENAI_API_KEY: z.string().min(1).optional(),
    AZURE_OPENAI_ENDPOINT: urlSchema.optional(),
    AZURE_OPENAI_DEPLOYMENT: z.string().min(1).optional(),
    AZURE_OPENAI_API_VERSION: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1).optional(),
    AWS_SES_REGION: z.string().min(1).optional(),
    AWS_S3_REPORTS_BUCKET: z.string().min(1).optional(),
    TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === 'local') {
      return;
    }

    (
      [
        ['PLAID_CLIENT_ID', env.PLAID_CLIENT_ID],
        ['PLAID_SECRET', env.PLAID_SECRET],
        ['AZURE_OPENAI_API_KEY', env.AZURE_OPENAI_API_KEY],
        ['AZURE_OPENAI_ENDPOINT', env.AZURE_OPENAI_ENDPOINT],
        ['AZURE_OPENAI_DEPLOYMENT', env.AZURE_OPENAI_DEPLOYMENT],
        ['AZURE_OPENAI_API_VERSION', env.AZURE_OPENAI_API_VERSION],
        ['AWS_REGION', env.AWS_REGION],
        ['AWS_SES_REGION', env.AWS_SES_REGION],
        ['AWS_S3_REPORTS_BUCKET', env.AWS_S3_REPORTS_BUCKET],
        ['TWILIO_ACCOUNT_SID', env.TWILIO_ACCOUNT_SID],
        ['TWILIO_AUTH_TOKEN', env.TWILIO_AUTH_TOKEN],
      ] as const
    ).forEach(([key, value]) => {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when APP_ENV is ${env.APP_ENV}`,
        });
      }
    });
  });

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: appEnvSchema.default('local'),
  NEXT_PUBLIC_API_BASE_URL: urlSchema,
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: urlSchema.optional(),
  NEXT_PUBLIC_SENTRY_DSN: urlSchema.optional(),
});

export type NodeEnv = z.infer<typeof nodeEnvSchema>;
export type AppEnv = z.infer<typeof appEnvSchema>;
export type ServerEnvInput = z.input<typeof serverEnvSchema>;
export type ClientEnvInput = z.input<typeof clientEnvSchema>;
