import FastifyAuth from "@fastify/auth";
import FastifyCors from "@fastify/cors";
import FastifyMultipart from "@fastify/multipart";
import FastifySwagger from "@fastify/swagger";
import FastifySwaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";

import { verifyTokenPlugin } from "./src/plugins/auth";
import { prismaPlugin } from "./src/plugins/prisma";

import { categorySchema } from "./src/schemas/category";
import { errorSchema } from "./src/schemas/error";
import { transactionSchema } from "./src/schemas/transaction";
import { userSchema } from "./src/schemas/user";

import { categoriesRoutes } from "./src/routes/categories";
import { dashboardRoutes } from "./src/routes/dashboard";
import { transactionsRoutes } from "./src/routes/transactions";
import { usersRoutes } from "./src/routes/users";

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

fastify.register(FastifyCors, {
  // TODO: Configure CORS properly for production
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
});

fastify.register(FastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  }
})

fastify.register(prismaPlugin);
fastify.register(verifyTokenPlugin);
fastify.register(FastifyAuth);

fastify.register(FastifySwaggerUi, {
  routePrefix: "/docs",
});

fastify.register(transactionsRoutes, { prefix: "/api" });
fastify.register(categoriesRoutes, { prefix: "/api" });
fastify.register(dashboardRoutes, { prefix: "/api" });
fastify.register(usersRoutes, { prefix: "/api" });

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
