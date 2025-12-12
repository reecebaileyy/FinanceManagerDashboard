import fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import type { PrismaClient } from "@prisma/client";

import prismaPlugin from "./plugins/prisma";
import { env as defaultEnv, type Env } from "./env";
import { authRoutes } from "./routes/auth-routes";
import { PrismaAuthRepository } from "./repositories/prisma-auth-repository";
import { ConsoleEmailService } from "./services/email-service";
import { AuthService } from "./services/auth-service";

export interface BuildAppOptions {
  env?: Env;
  prismaClient?: PrismaClient;
  logger?: FastifyInstance["log"];
}

export async function buildApp(options: BuildAppOptions = {}) {
  const resolvedEnv = options.env ?? defaultEnv;

  const app = fastify({
    logger: options.logger ?? {
      level: resolvedEnv.isProduction ? "info" : "debug",
    },
  });

  await app.register(sensible);
  await app.register(cookie, {
    secret: undefined,
    parseOptions: {
      sameSite: "lax",
      secure: resolvedEnv.COOKIE_SECURE,
      domain: resolvedEnv.COOKIE_DOMAIN,
      path: "/",
    },
  });
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: resolvedEnv.RATE_LIMIT_MAX,
    timeWindow: resolvedEnv.RATE_LIMIT_WINDOW_MINUTES + " minutes",
  });
  await app.register(jwt, {
    secret: resolvedEnv.JWT_ACCESS_SECRET,
    sign: {
      expiresIn: resolvedEnv.ACCESS_TOKEN_TTL_SECONDS,
    },
  });
  await app.register(prismaPlugin, { client: options.prismaClient });

  const repository = new PrismaAuthRepository(app.prisma);
  const emailService = new ConsoleEmailService();
  const authService = new AuthService({
    repository,
    env: resolvedEnv,
    emailService
  });

  app.decorate("authService", authService);

  await app.register(authRoutes, { env: resolvedEnv });

  return app;
}
