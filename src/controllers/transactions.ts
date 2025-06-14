import { v4 as uuidv4 } from "uuid";
import { mockedTransactions } from "../mockedItems";

export const getTransactions = (req, reply) => reply.send(mockedTransactions);

export const getTransaction = (req, reply) => {
  const { id } = req.params;
  const transaction = mockedTransactions.find((i) => i.id === id);
  reply.send(transaction);
};

export const createTransaction = (req, reply) => {
  const newTransaction = req.body;
  newTransaction.id = uuidv4();
  newTransaction.createdAt = new Date().toISOString();
  newTransaction.updatedAt = new Date().toISOString();
  mockedTransactions.push(newTransaction);
  reply.code(201).send(newTransaction);
};

export const deleteTransaction = (req, reply) => {
  const { id } = req.params;
  const index = mockedTransactions.findIndex((tr) => tr.id === id);
  if (index === -1) {
    return reply.code(404).send({
      error: "Not Found",
      message: `Transaction with id ${id} not found`,
      statusCode: 404,
    });
  }
  mockedTransactions.splice(index, 1);
  reply.code(204).send();
};

export const editTransaction = (req, reply) => {
  const { id } = req.params;
  const index = mockedTransactions.findIndex((tr) => tr.id === id);
  if (index === -1) {
    return reply.code(404).send({
      error: "Not Found",
      message: `Transaction with id ${id} not found`,
      statusCode: 404,
    });
  }
  // TODO: Sanitize the request body to only include fields that can be updated
  // TODO: Make sure the the values can't cause SQL injection or other security issues
  const foundTransaction = mockedTransactions[index];
  const updatedTransaction = { ...foundTransaction, ...req.body };
  updatedTransaction.updatedAt = new Date().toISOString();
  mockedTransactions[index] = updatedTransaction;
  reply.code(204).send();
};
