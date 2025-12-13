import { z } from "zod";

import type { AuthSession } from "./types";

export const SESSION_COOKIE_NAME = "fm_session";
export const SESSION_COOKIE_PATH = "/";
export const SESSION_DEFAULT_TTL_SECONDS = 60 * 30; // 30 minutes

const isoDateString = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Value must be an ISO 8601 timestamp.",
  });

const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  roles: z.array(z.string()).default([]),
  avatarUrl: z.string().url().optional(),
});

const sessionMetadataSchema = z
  .object({
    isTwoFactorEnrolled: z.boolean().optional(),
    featureFlags: z.array(z.string()).optional(),
  })
  .optional();

const sessionSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["authenticated", "demo"]),
  user: sessionUserSchema,
  issuedAt: isoDateString,
  expiresAt: isoDateString,
  metadata: sessionMetadataSchema,
});

export type SessionCookiePayload = z.infer<typeof sessionSchema>;

export function createSessionPayload(input: Omit<SessionCookiePayload, "version" | "issuedAt" | "expiresAt"> & {
  ttlSeconds?: number;
  issuedAt?: string;
  expiresAt?: string;
}): SessionCookiePayload {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const ttlSeconds = input.ttlSeconds ?? SESSION_DEFAULT_TTL_SECONDS;
  const expiresAt = input.expiresAt ?? new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const payload: SessionCookiePayload = {
    version: 1,
    kind: input.kind,
    user: {
      ...input.user,
      roles: Array.isArray(input.user.roles) ? input.user.roles : [],
    },
    issuedAt,
    expiresAt,
    metadata: input.metadata,
  };

  const parsed = sessionSchema.parse(payload);
  return parsed;
}

export function serializeSessionCookie(payload: AuthSession): string {
  const validated = sessionSchema.parse(payload);
  return encodeURIComponent(JSON.stringify(validated));
}

export function parseSessionCookie(raw: string | undefined | null): AuthSession | null {
  if (!raw) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    const result = sessionSchema.safeParse(parsed);

    if (!result.success) {
      return null;
    }

    if (isSessionExpired(result.data)) {
      return null;
    }

    return result.data;
  } catch (error) {
    return null;
  }
}

export function isSessionExpired(session: Pick<AuthSession, "expiresAt">): boolean {
  const expiresAtMs = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return true;
  }

  return Date.now() >= expiresAtMs;
}

export function getCookieMaxAgeSeconds(session: Pick<AuthSession, "expiresAt">): number {
  const expiresAtMs = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return 0;
  }

  const remainingMs = expiresAtMs - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export function buildSessionFromPayload(payload: SessionCookiePayload): AuthSession {
  return sessionSchema.parse(payload);
}
