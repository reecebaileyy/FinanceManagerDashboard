import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
const candidatePath = path.resolve(__dirname, "..", envFile);

if (fs.existsSync(candidatePath)) {
  loadEnv({ path: candidatePath });
} else {
  loadEnv();
}

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4001),
    HOST: z.string().default("0.0.0.0"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 15),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
    PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: z.coerce.boolean().default(true),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
  })
  .transform((value) => ({
    ...value,
    isProduction: value.NODE_ENV === "production",
  }));

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
