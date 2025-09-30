import { FastifyInstance } from "fastify";
import { getRecurringTransactions } from "../controllers/recurring-transactions";

const getRecurringTransactionOptions = {
  schema: {
    response: {
      201: {
        type: "array",
        items: {
          $ref: "recurringTransactionSchema#",
        },
      },
    },
  },
  handler: getRecurringTransactions,
};

export const recurringTransactionsRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/recurring-transactions", {
    ...getRecurringTransactionOptions,
    preHandler: fastify.auth([fastify.verifyToken]),
  });
};
