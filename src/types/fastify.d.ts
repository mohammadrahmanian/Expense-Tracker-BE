import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    verifyToken: (
      request: FastifyRequest,
      reply: FastifyReply,
      done: (err?: Error) => void
    ) => void;
  }
  interface FastifyRequest {
    user?: {
      id: string;
    };
  }
}
