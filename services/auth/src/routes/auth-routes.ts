import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import type { Env } from "../env";
import type { AuthTokens } from "../services/auth-service";
import { ServiceError } from "../errors";
import type { AuthUser } from "../domain/models";

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a digit")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

const SignupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: passwordSchema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  planTier: z.enum(["free", "pro", "family"]).optional(),
  timezone: z.string().max(64).optional(),
  acceptTerms: z.literal(true),
  marketingOptIn: z.boolean().optional(),
});

const LoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  rememberMe: z.boolean().optional(),
  challengeId: z.string().uuid().optional(),
  mfaCode: z.string().regex(/^[0-9]{6}$/).optional(),
});

const RefreshSchema = z.object({
  refreshToken: z.string().optional(),
});

const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
});

const PasswordResetRequestSchema = z.object({
  email: z.string().trim().email().max(254),
});

const PasswordResetConfirmSchema = z.object({
  token: z.string().min(10),
  newPassword: passwordSchema,
});

const VerifyEmailSchema = z.object({
  token: z.string().min(10),
});

export interface AuthRoutesOptions {
  env: Env;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, opts) => {
  const { env } = opts;

  fastify.post("/api/auth/signup", async (request, reply) => {
    const body = SignupSchema.parse(request.body);

    try {
      const result = await fastify.authService.signup(body, buildContext(request));
      setAuthCookies(reply, env, result.tokens);

      return reply.code(201).send({
        data: {
          user: serializeUser(result.user),
          session: serializeSession(result.tokens),
          requiresEmailVerification: result.requiresEmailVerification,
          debug: result.debug,
        },
        meta: {},
      });
    } catch (error) {
      return handleServiceError(request, reply, error);
    }
  });

  fastify.post("/api/auth/login", async (request, reply) => {
    const body = LoginSchema.parse(request.body);

    try {
      const result = await fastify.authService.login(body, buildContext(request));
      setAuthCookies(reply, env, result.tokens);

      return reply.code(200).send({
        data: {
          user: serializeUser(result.user),
          session: serializeSession(result.tokens),
          emailVerified: result.emailVerified,
        },
        meta: {},
      });
    } catch (error) {
      return handleServiceError(request, reply, error);
    }
  });

  fastify.post("/api/auth/refresh", async (request, reply) => {
    const body = RefreshSchema.parse(request.body ?? {});
    const refreshToken = body.refreshToken ?? request.cookies.fm_refresh;

    if (!refreshToken) {
      return reply.code(400).send({
        error: {
          code: "AUTH_MISSING_REFRESH_TOKEN",
          message: "Refresh token not provided.",
        },
        correlationId: request.id,
      });
    }

    try {
      const result = await fastify.authService.refreshSession(refreshToken, buildContext(request));
      setAuthCookies(reply, env, result.tokens);

      return reply.code(200).send({
        data: {
          user: serializeUser(result.user),
          session: serializeSession(result.tokens),
        },
        meta: {},
      });
    } catch (error) {
      return handleServiceError(request, reply, error);
    }
  });

  fastify.post("/api/auth/logout", async (request, reply) => {
    const body = LogoutSchema.safeParse(request.body ?? {});
    const refreshToken = body.success ? body.data.refreshToken : request.cookies.fm_refresh;

    await fastify.authService.logout(refreshToken ?? null, buildContext(request));
    clearAuthCookies(reply, env);

    return reply.code(204).send();
  });

  fastify.post("/api/auth/password/reset-request", async (request, reply) => {
    const body = PasswordResetRequestSchema.parse(request.body);

    await fastify.authService.requestPasswordReset(body, buildContext(request));

    return reply.code(202).send({
      data: {
        requested: true,
      },
      meta: {},
    });
  });

  fastify.post("/api/auth/password/reset", async (request, reply) => {
    const body = PasswordResetConfirmSchema.parse(request.body);

    try {
      const result = await fastify.authService.resetPassword(body, buildContext(request));
      clearAuthCookies(reply, env);

      return reply.code(200).send({
        data: {
          user: serializeUser(result.user),
        },
        meta: {},
      });
    } catch (error) {
      return handleServiceError(request, reply, error);
    }
  });

  fastify.post("/api/auth/email/verify", async (request, reply) => {
    const body = VerifyEmailSchema.parse(request.body);

    try {
      const result = await fastify.authService.verifyEmail(body, buildContext(request));

      return reply.code(200).send({
        data: {
          user: serializeUser(result.user),
        },
        meta: {},
      });
    } catch (error) {
      return handleServiceError(request, reply, error);
    }
  });
};

function buildContext(request: FastifyRequest) {
  return {
    ipAddress: request.ip ?? null,
    userAgent: request.headers["user-agent"] ?? null,
  };
}

function serializeUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    planTier: user.planTier,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    timezone: user.timezone ?? null,
  };
}

function serializeSession(tokens: AuthTokens) {
  return {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt.toISOString(),
  };
}

function setAuthCookies(reply: FastifyReply, env: Env, tokens: AuthTokens) {
  const accessMaxAge = Math.max(
    1,
    Math.floor((tokens.accessTokenExpiresAt.getTime() - Date.now()) / 1000),
  );
  const refreshMaxAge = Math.max(
    1,
    Math.floor((tokens.refreshTokenExpiresAt.getTime() - Date.now()) / 1000),
  );

  reply.setCookie("fm_session", tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
    maxAge: accessMaxAge,
  });

  reply.setCookie("fm_refresh", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
    maxAge: refreshMaxAge,
  });
}

function clearAuthCookies(reply: FastifyReply, env: Env) {
  reply.setCookie("fm_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
    maxAge: 0,
  });

  reply.setCookie("fm_refresh", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
    maxAge: 0,
  });
}

function handleServiceError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof ServiceError) {
    reply.code(error.status).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
      correlationId: request.id,
    });
    return reply;
  }

  throw error;
}
