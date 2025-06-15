import { v4 as uuidv4 } from "uuid";
import { transactions } from "../mocked/transactions";
import { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import { Transaction } from "../types/transaction";

type RequestParams = {
  id: string;
};

export const getTransactions: RouteHandlerMethod = (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { user } = req;
  // TODO: Use database
  const userTransactions = transactions.filter((tr) => tr.userId === user.id);
  reply.send(userTransactions);
};

export const getTransaction: RouteHandlerMethod = (
  req: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user } = req;
  // TODO: Use database
  const transaction = transactions.find(
    (tr) => tr.id === id && tr.userId === user.id
  );
  if (!transaction) {
    return reply.code(404).send({
      error: "Not Found",
      message: `Transaction with id ${id} not found`,
      statusCode: 404,
    });
  }
  reply.send(transaction);
};

type CreateTransactionBody = Omit<
  Transaction,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export const createTransaction = (
  req: FastifyRequest<{ Body: CreateTransactionBody }>,
  reply: FastifyReply
) => {
  const { user } = req;
  const newTransaction: Transaction = {
    // TODO: Sanitize the request body to only include fields that can be created
    ...req.body,
    id: uuidv4(),
    userId: user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // TODO: Use database
  transactions.push(newTransaction);
  reply.code(201).send(newTransaction);
};

export const deleteTransaction = (
  req: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user } = req;
  const index = transactions.findIndex(
    (tr) => tr.id === id && tr.userId === user.id
  );

  if (index === -1) {
    return reply.code(404).send({
      error: "Not Found",
      message: `Transaction with id ${id} not found`,
      statusCode: 404,
    });
  }
  // TODO: Use database
  transactions.splice(index, 1);
  reply.code(204).send();
};

export const editTransaction = (
  req: FastifyRequest<{ Params: RequestParams; Body: Partial<Transaction> }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user } = req;
  const index = transactions.findIndex(
    (tr) => tr.id === id && tr.userId === user.id
  );
  if (index === -1) {
    return reply.code(404).send({
      error: "Not Found",
      message: `Transaction with id ${id} not found`,
      statusCode: 404,
    });
  }
  // TODO: Sanitize the request body to only include fields that can be updated
  // TODO: Make sure the the values can't cause SQL injection or other security issues
  const foundTransaction = transactions[index];
  const updatedTransaction = { ...foundTransaction, ...req.body };
  updatedTransaction.updatedAt = new Date().toISOString();
  transactions[index] = updatedTransaction;
  reply.code(204).send();
};
