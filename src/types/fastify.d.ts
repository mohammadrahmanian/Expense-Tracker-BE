import { PrismaClient } from "@prisma/client";
import { FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    verifyToken: (
      request: FastifyRequest,
      reply: FastifyReply,
      done: (err?: Error) => void
    ) => Promise<void>;
  }
  interface FastifyRequest {
    user?: {
      id: string;
    };
  }
}
