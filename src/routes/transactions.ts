import { FastifyInstance } from "fastify";

import { Transaction } from "../types/transaction";
import {
  createTransaction,
  deleteTransaction,
  editTransaction,
  getTransaction,
  getTransactions,
} from "../controllers/transactions";

type TransactionParams = {
  id: string;
};

const getTransactionsOpts = {
  schema: {
    response: {
      200: {
        type: "array",
        items: { $ref: "transactionSchema#" },
      },
    },
  },
  handler: getTransactions,
};

const getTransactionOpts = {
  schema: {
    response: {
      200: { $ref: "transactionSchema#" },
      404: { $ref: "errorSchema#" },
    },
  },
  handler: getTransaction,
};

const createTransactionOpts = {
  schema: {
    body: {
      type: "object",
      required: ["title", "amount", "date", "category", "type"],
      properties: {
        title: { $ref: "transactionSchema#/properties/title" },
        amount: { $ref: "transactionSchema#/properties/amount" },
        date: { $ref: "transactionSchema#/properties/date" },
        description: { $ref: "transactionSchema#/properties/description" },
        category: { $ref: "transactionSchema#/properties/category" },
        type: { $ref: "transactionSchema#/properties/type" },
      },
    },
    response: {
      201: { $ref: "transactionSchema#" },
      400: { $ref: "errorSchema#" },
    },
  },
  handler: createTransaction,
};

const deleteTransactionOpts = {
  schema: {
    response: {
      204: {
        type: "null",
      },
      404: { $ref: "errorSchema#" },
    },
    params: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
    },
  },
  handler: deleteTransaction,
};

const editTransactionOpts = {
  schema: {
    body: {
      type: "object",
      properties: {
        title: { $ref: "transactionSchema#/properties/title" },
        amount: { $ref: "transactionSchema#/properties/amount" },
        date: { $ref: "transactionSchema#/properties/date" },
        description: { $ref: "transactionSchema#/properties/description" },
        category: { $ref: "transactionSchema#/properties/category" },
        type: { $ref: "transactionSchema#/properties/type" },
      },
    },
    response: {
      204: {
        type: "null",
      },
      404: { $ref: "errorSchema#" },
    },
  },
  handler: editTransaction,
};

export const transactionsRoutes = (fastify: FastifyInstance, options, done) => {
  fastify.get("/transactions", {
    ...getTransactionsOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.get<{
    Params: TransactionParams;
    Reply: Transaction;
  }>("/transactions/:id", {
    ...getTransactionOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.post("/transactions", {
    ...createTransactionOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.delete("/transactions/:id", {
    ...deleteTransactionOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.put("/transactions/:id", {
    ...editTransactionOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  done();
};
