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
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
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
      201: { ref: "transactionSchema#" },
      400: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
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
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
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
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
    },
  },
  handler: editTransaction,
};

export const transactionsRoute = (fastify: FastifyInstance, options, done) => {
  fastify.get("/transactions", getTransactionsOpts);

  fastify.get<{
    Params: TransactionParams;
    Reply: Transaction;
  }>("/transactions/:id", getTransactionOpts);

  fastify.post("/transactions", createTransactionOpts);

  fastify.delete("/transactions/:id", deleteTransactionOpts);

  fastify.put("/transactions/:id", editTransactionOpts);

  done();
};
