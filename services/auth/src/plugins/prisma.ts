import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

export interface PrismaPluginOptions {
  client?: PrismaClient;
}

export default fp<PrismaPluginOptions>(async (fastify, opts) => {
  const prisma = opts.client ?? new PrismaClient();
  const ownsClient = !opts.client;

  if (ownsClient) {
    await prisma.$connect();
  }

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async () => {
    if (ownsClient) {
      await prisma.$disconnect();
    }
  });
});
