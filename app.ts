import Fastify from "fastify";
import FastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { transactionsRoute } from "./src/routes/transactions";
import { transactionSchema } from "./src/schemas/transaction";

const PORT = 5000;

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

fastify.register(transactionsRoute);

fastify.addSchema(transactionSchema);

const start = async () => {
  try {
    await fastify.listen({ port: PORT });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
