import Fastify from "fastify";
import FastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import FastifyAuth from "@fastify/auth";

import { verifyTokenPlugin } from "./src/plugins/auth";
import { prismaPlugin } from "./src/plugins/prisma";

import { transactionSchema } from "./src/schemas/transaction";
import { userSchema } from "./src/schemas/user";
import { categorySchema } from "./src/schemas/category";
import { errorSchema } from "./src/schemas/error";

import { usersRoutes } from "./src/routes/users";
import { categoriesRoutes } from "./src/routes/categories";
import { transactionsRoutes } from "./src/routes/transactions";

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

const fastify = Fastify({
  logger: true,
});

fastify.register(FastifySwagger, {
  openapi: {
    info: {
      title: "Transaction API",
      description: "API for managing transactions",
      version: "1.0.0",
    },
  },
});

fastify.register(prismaPlugin);
fastify.register(verifyTokenPlugin);
fastify.register(FastifyAuth);

fastify.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});

fastify.register(transactionsRoutes);
fastify.register(categoriesRoutes);
fastify.register(usersRoutes);

fastify.addSchema(transactionSchema);
fastify.addSchema(categorySchema);
fastify.addSchema(userSchema);
fastify.addSchema(errorSchema);

const start = async () => {
  try {
    // TODO: Add env variable zod validation
    const port = Number(PORT);
    await fastify.listen({ host: HOST, port });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
