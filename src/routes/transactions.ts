import { FastifyInstance } from "fastify";

import { Transaction } from "@prisma/client";
import {
  createTransaction,
  deleteTransaction,
  editTransaction,
  getTransaction,
  getTransactions,
  uploadTransactions,
} from "../controllers/transactions";

type TransactionParams = {
  id: Transaction["id"];
};

const getTransactionsOpts = {
  schema: {
    querystring: {
      type: "object",
      properties: {
        limit: { type: "number", minimum: 1, default: 50 },
        offset: { type: "number", minimum: 0, default: 0 },
        sort: {
          type: "string",
          enum: ["date", "amount"],
        },
        order: { type: "string", enum: ["asc", "desc"] },
        type: { type: "string", enum: ["INCOME", "EXPENSE"] },
        fromDate: { type: "string", format: "date-time" },
        toDate: { type: "string", format: "date-time" },
        categoryId: { type: "string" },
        query: { type: "string" },
      },
    },
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
      required: ["title", "amount", "date", "categoryId", "type"],
      properties: {
        title: { $ref: "transactionSchema#/properties/title" },
        amount: { $ref: "transactionSchema#/properties/amount" },
        date: { $ref: "transactionSchema#/properties/date" },
        description: { $ref: "transactionSchema#/properties/description" },
        categoryId: { $ref: "transactionSchema#/properties/categoryId" },
        type: { $ref: "transactionSchema#/properties/type" },
        isRecurring: { $ref: "transactionSchema#/properties/isRecurring" },
        recurrenceFrequency: {
          $ref: "transactionSchema#/properties/recurrenceFrequency",
        },
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
        categoryId: { $ref: "transactionSchema#/properties/categoryId" },
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

const uploadTransactionsOpts = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          message: { type: "string" },
          successfulRecords: { type: "number" },
          failedRecords: { type: "number" },
        },
      },
      400: { $ref: "errorSchema#" },
    },
  },
  handler: uploadTransactions,
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

  fastify.post("/transactions/upload", {
    ...uploadTransactionsOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  done();
};
