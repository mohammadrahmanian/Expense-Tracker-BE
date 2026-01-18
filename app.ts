import "./src/instrument";

import FastifyAuth from "@fastify/auth";
import FastifyCookie from "@fastify/cookie";
import FastifyCors from "@fastify/cors";
import FastifyMultipart from "@fastify/multipart";
import FastifySwagger from "@fastify/swagger";
import FastifySwaggerUi from "@fastify/swagger-ui";
import * as Sentry from "@sentry/node";
import Fastify from "fastify";
import FastifyCron from "fastify-cron";

import { verifyTokenPlugin } from "./src/plugins/auth";
import { prismaPlugin } from "./src/plugins/prisma";

import { categorySchema } from "./src/schemas/category";
import { errorSchema } from "./src/schemas/error";
import { transactionSchema } from "./src/schemas/transaction";
import { userSchema } from "./src/schemas/user";

import { createTransactionFromRecurringTransaction } from "./src/jobs/recurring-transactions";
import { categoriesRoutes } from "./src/routes/categories";
import { dashboardRoutes } from "./src/routes/dashboard";
import { recurringTransactionsRoutes } from "./src/routes/recurring-transactions";
import { transactionsRoutes } from "./src/routes/transactions";
import { usersRoutes } from "./src/routes/users";
import { recurringTransactionSchema } from "./src/schemas/recurring-transaction";

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

const API_PREFIX = "/api";

const fastify = Fastify({
  logger: true,
});

fastify.register(FastifyCookie);

Sentry.setupFastifyErrorHandler(fastify);

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
  origin: process.env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
});

fastify.register(FastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
});

fastify.register(prismaPlugin);
fastify.register(verifyTokenPlugin);
fastify.register(FastifyAuth);

fastify.register(FastifySwaggerUi, {
  routePrefix: "/docs",
});

fastify.addSchema(transactionSchema);
fastify.addSchema(recurringTransactionSchema);
fastify.addSchema(categorySchema);
fastify.addSchema(userSchema);
fastify.addSchema(errorSchema);

fastify.register(transactionsRoutes, { prefix: API_PREFIX });
fastify.register(recurringTransactionsRoutes, { prefix: API_PREFIX });
fastify.register(categoriesRoutes, { prefix: API_PREFIX });
fastify.register(dashboardRoutes, { prefix: API_PREFIX });
fastify.register(usersRoutes, { prefix: API_PREFIX });

fastify.register(FastifyCron, {
  jobs: [
    {
      name: "recurring transactions",
      cronTime: "0 0 * * *", // Everyday at midnight UTC

      // Note: the callbacks (onTick & onComplete) take the server
      // as an argument, as opposed to nothing in the node-cron API:
      onTick: async (server) => {
        await createTransactionFromRecurringTransaction({
          prisma: server.prisma,
          log: server.log,
        });
      },
    },
  ],
});

const start = async () => {
  try {
    // TODO: Add env variable zod validation
    const port = Number(PORT);

    await fastify.listen({ host: HOST, port });
    if (process.env.NODE_ENV === "production") {
      fastify.log.info(`Starting cron jobs...`);
      fastify.cron.getJobByName("recurring transactions").start();
    }
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
