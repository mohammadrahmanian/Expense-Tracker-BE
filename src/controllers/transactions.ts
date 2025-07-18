import { Transaction } from "@prisma/client";
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RouteHandlerMethod,
} from "fastify";

type RequestParams = {
  id: string;
};

export const getTransactions: RouteHandlerMethod = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { user, server } = req;
  try {
    const transactions = await server.prisma.transaction.findMany({
      where: { userId: user.id },
    });
    return reply.send(transactions);
  } catch (error) {
    server.log.error("Error fetching transactions:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

export const getTransaction: RouteHandlerMethod = async (
  req: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user, server } = req;
  try {
    const transaction = await server.prisma.transaction.findUnique({
      where: { userId: user.id, id: id },
    });
    if (!transaction) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Transaction with id ${id} not found`,
        statusCode: 404,
      });
    }
    return reply.send(transaction);
  } catch (error) {
    server.log.error("Error fetching transaction:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

export const createTransaction = async (
  req: FastifyRequest<{ Body: Transaction }>,
  reply: FastifyReply
) => {
  const { user, server } = req;

  const {
    id: _,
    userId: __,
    createdAt: ___,
    updatedAt: ____,
    categoryId,
    ...allowedFields
  } = req.body;

  try {
    await validateTransactionWithCategory({
      transactionType: allowedFields.type,
      categoryId,
      userId: user.id,
      server,
    });
  } catch (error) {
    server.log.error("Validation error:", error);
    return reply.code(400).send({
      error: "Bad Request",
      message: error.message,
    });
  }

  try {
    const transaction = await server.prisma.transaction.create({
      data: {
        ...allowedFields,
        category: {
          connect: { id: categoryId },
        },
        user: {
          connect: { id: user.id },
        },
      },
    });

    return reply.code(201).send(transaction);
  } catch (error) {
    server.log.error("Error creating transaction:", error);

    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

export const deleteTransaction = async (
  req: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user, server } = req;
  try {
    await server.prisma.transaction.delete({
      where: { userId: user.id, id: id },
    });

    return reply.code(204).send();
  } catch (error) {
    server.log.error("Error detecting transaction:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

export const editTransaction = async (
  req: FastifyRequest<{ Params: RequestParams; Body: Partial<Transaction> }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user, server } = req;

  const {
    id: _,
    userId: __,
    createdAt: ___,
    updatedAt: ____,
    categoryId,
    ...allowedFields
  } = req.body;

  if (categoryId !== undefined) {
    try {
      await validateTransactionWithCategory({
        transactionType: allowedFields.type,
        categoryId,
        userId: user.id,
        server,
      });
    } catch (error) {
      server.log.error("Validation error:", error);
      return reply.code(400).send({
        error: "Bad Request",
        message: error.message,
      });
    }
  }

  try {
    await server.prisma.transaction.update({
      where: { userId: user.id, id: id },
      data: {
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
        ...allowedFields,
      },
    });

    return reply.code(204).send();
  } catch (error) {
    server.log.error("Error editing transaction:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

const validateTransactionWithCategory = async ({
  transactionType,
  categoryId,
  userId,
  server,
}: {
  transactionType?: Transaction["type"];
  categoryId: string;
  userId: string;
  server: FastifyInstance;
}) => {
  const category = await server.prisma.category.findUnique({
    where: { id: categoryId, userId },
  });
  if (!category) {
    throw new Error(`Category with id ${categoryId} not found`);
  }
  // Ensure the transaction type matches the category type
  if (transactionType && transactionType !== category.type) {
    throw new Error(
      `Transaction type must match category type (${category.type})`
    );
  }
};
