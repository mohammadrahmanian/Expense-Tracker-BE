import { PrismaClient } from "@prisma/client";
import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    verifyToken: (request: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    user?: {
      id: string;
    };
  }
}
