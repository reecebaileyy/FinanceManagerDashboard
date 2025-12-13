import type { PrismaClient } from "@prisma/client";
import type { AuthService } from "../services/auth-service";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authService: AuthService;
  }
}
