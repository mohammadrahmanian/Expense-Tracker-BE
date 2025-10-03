import { FastifyInstance } from "fastify";
import {
  deleteRecurringTransaction,
  editRecurringTransaction,
  getRecurringTransactions,
  toggleRecurringTransaction,
} from "../controllers/recurring-transactions";

const getRecurringTransactionOptions = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          recurringTransactions: {
            type: "array",
            items: { $ref: "recurringTransactionSchema#" },
          },
        },
      },
    },
  },
  handler: getRecurringTransactions,
};

const deleteRecurringTransactionOptions = {
  schema: {
    response: {
      204: {
        type: "null",
      },
      400: {
        $ref: "errorSchema#",
      },
    },
  },
  handler: deleteRecurringTransaction,
};

const editRecurringTransactionOptions = {
  schema: {
    body: {
      type: "object",
      properties: {
        title: { $ref: "recurringTransactionSchema#/properties/title" },
        description: {
          $ref: "recurringTransactionSchema#/properties/description",
        },
        amount: { $ref: "recurringTransactionSchema#/properties/amount" },
        categoryId: {
          $ref: "recurringTransactionSchema#/properties/categoryId",
        },
        type: { $ref: "recurringTransactionSchema#/properties/type" },
        endDate: { $ref: "recurringTransactionSchema#/properties/endDate" },
      },
    },
    response: {
      204: {
        type: "null",
      },
      400: {
        $ref: "errorSchema#",
      },
    },
  },
  handler: editRecurringTransaction,
};

export const toggleRecurringTransactionOptions = {
  schema: {
    body: {
      type: "object",
      properties: {
        active: { $ref: "recurringTransactionSchema#/properties/isActive" },
      },
      required: ["active"],
    },
    response: {
      204: { type: "null" },
      400: { $ref: "errorSchema#" },
    },
  },
  handler: toggleRecurringTransaction,
};

export const recurringTransactionsRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/recurring-transactions", {
    ...getRecurringTransactionOptions,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.post("/recurring-transactions/:id/toggle", {
    ...toggleRecurringTransactionOptions,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.put("/recurring-transactions/:id", {
    ...editRecurringTransactionOptions,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.delete("/recurring-transactions/:id", {
    ...deleteRecurringTransactionOptions,
    preHandler: fastify.auth([fastify.verifyToken]),
  });
};
