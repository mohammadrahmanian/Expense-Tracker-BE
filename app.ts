import Fastify from "fastify";
import FastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import FastifyAuth from "@fastify/auth";

import { transactionsRoutes } from "./src/routes/transactions";
import { transactionSchema } from "./src/schemas/transaction";
import { userSchema } from "./src/schemas/user";
import { verifyToken } from "./src/plugins/auth";
import { usersRoutes } from "./src/routes/users";

const PORT = 5000;
const HOST = "0.0.0.0";

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

fastify.register(fastifySwaggerUi, {
  routePrefix: "/docs",
});

fastify.decorate("verifyToken", verifyToken).register(FastifyAuth);
fastify.register(transactionsRoutes);

fastify.register(usersRoutes);

fastify.addSchema(transactionSchema);
fastify.addSchema(userSchema);

const start = async () => {
  try {
    await fastify.listen({ host: HOST, port: PORT });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
