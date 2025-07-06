import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

export const prismaPlugin: FastifyPluginAsync = fp(async (server, options) => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

  try {
    await prisma.$connect();
  } catch (error) {
    server.log.error(`Error connecting to the database: ${error}`);
    throw error;
  }

  server.decorate("prisma", prisma);

  server.addHook("onClose", async (server) => {
    try {
      await server.prisma.$disconnect();
    } catch (error) {
      server.log.error(`Error disconnecting from the database: ${error}`);
      throw error;
    }
  });
});
