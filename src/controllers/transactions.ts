import { RecurrenceFrequency, Transaction, Type } from "@prisma/client";

import { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";

import { importCsvRecords } from "../services/data-exchange";
import { createUserRecurringTransaction } from "../services/recurring-transactions";
import {
  createUserTransaction,
  getUserTransactions,
  validateUserTransactionType,
} from "../services/transactions";

type RequestParams = {
  id: string;
};

export const getTransactions: RouteHandlerMethod = async (
  req: FastifyRequest<{
    Querystring: {
      limit?: number;
      offset?: number;
      sort?: string;
      order?: "asc" | "desc";
      type?: Type;
      fromDate?: string;
      toDate?: string;
      categoryId?: string;
      query?: string;
    };
  }>,
  reply: FastifyReply
) => {
  const { user, server } = req;
  const {
    limit = 50,
    offset = 0,
    sort = "date",
    order = "desc",
    type,
    categoryId,
    fromDate,
    toDate,
    query,
  } = req.query;

  const allowedSorts = new Set(["date", "amount"]);
  const normalizedSort = allowedSorts.has(sort ?? "") ? sort! : "date";

  const parsedFromDate = fromDate ? new Date(fromDate) : undefined;
  const parsedToDate = toDate ? new Date(toDate) : undefined;

  if (parsedFromDate && isNaN(parsedFromDate.getTime())) {
    return reply
      .code(400)
      .send({ error: "Bad Request", message: "Invalid fromDate format" });
  }
  if (parsedToDate && isNaN(parsedToDate.getTime())) {
    return reply
      .code(400)
      .send({ error: "Bad Request", message: "Invalid toDate format" });
  }

  try {
    const transactions = await getUserTransactions({
      userId: user.id,
      prisma: server.prisma,
      limit: Number(limit),
      offset: Number(offset),
      sort: normalizedSort as "date" | "amount",
      order,
      type,
      fromDate: parsedFromDate,
      toDate: parsedToDate,
      categoryId,
      query,
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
  req: FastifyRequest<{
    Body: Transaction & {
      isRecurring: boolean;
      recurrenceFrequency: RecurrenceFrequency;
    };
  }>,
  reply: FastifyReply
) => {
  const {
    user,
    server: { prisma, log },
  } = req;

  // Extract only the allowed fields from the request body
  const {
    title,
    amount,
    type,
    description,
    categoryId,
    isRecurring,
    recurrenceFrequency,
    date,
  } = req.body;
  const allowedFields = {
    title,
    amount,
    type,
    description,
    date,
  };

  try {
    await validateUserTransactionType({
      transactionType: allowedFields.type,
      categoryId,
      userId: user.id,
      prisma,
    });
  } catch (error) {
    log.error("Validation error:", error);
    return reply.code(400).send({
      error: "Bad Request",
      message: error.message,
    });
  }

  if (isRecurring) {
    try {
      const { date, ...recurringTransactionAllowedFields } = allowedFields;
      const transaction = await prisma.$transaction(async (tx) => {
        await createUserRecurringTransaction({
          recurringTransaction: {
            ...recurringTransactionAllowedFields,
            recurrenceFrequency,
            startDate: date || new Date(),
            endDate: null,
          },
          userId: user.id,
          categoryId,
          prisma: tx,
        });
        const transaction = await createUserTransaction({
          transaction: allowedFields,
          userId: user.id,
          categoryId,
          prisma: tx,
        });

        return transaction;
      });
      return reply.code(201).send(transaction);
    } catch (error) {
      log.error("Error creating recurring transaction:", error);
      return reply.code(500).send({
        error: "Internal Server Error",
      });
    }
  }

  try {
    const transaction = await createUserTransaction({
      transaction: allowedFields,
      userId: user.id,
      categoryId,
      prisma,
    });

    return reply.code(201).send(transaction);
  } catch (error) {
    log.error("Error creating transaction:", error);
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

// Edit Transaction doesn't allow recurrence change because of performance issue it can cause
export const editTransaction = async (
  req: FastifyRequest<{ Params: RequestParams; Body: Partial<Transaction> }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const {
    user,
    server: { prisma, log },
  } = req;

  const { title, amount, type, description, categoryId, date } = req.body;
  // Create allowedFields object with only scalar fields (excluding categoryId and undefined values)
  const allowedFields = Object.fromEntries(
    Object.entries({
      title,
      amount,
      type,
      description,
      date,
    }).filter(([, value]) => value !== undefined)
  );

  const transactionToBeUpdated = await prisma.transaction.findUnique({
    where: { id },
    select: {
      category: { select: { type: true, id: true } },
      type: true,
      userId: true,
    },
  });

  if (!transactionToBeUpdated) {
    log.error(`Transaction with id ${id} not found`);
    return reply.code(404).send({
      error: "Not Found",
      message: `Transaction with id ${id} not found`,
    });
  }

  if (transactionToBeUpdated.userId !== user.id) {
    log.error(`User ${user.id} is not authorized to edit transaction ${id}`);
    // Returning 404 to avoid exposing the existence of the transaction
    return reply.code(404).send({
      error: "Not Found",
      message: `Transaction with id ${id} not found`,
    });
  }

  if (categoryId !== undefined) {
    try {
      const effectiveType =
        (allowedFields.type as Transaction["type"] | undefined) ??
        transactionToBeUpdated.type;

      await validateUserTransactionType({
        transactionType: effectiveType,
        categoryId,
        userId: user.id,
        prisma,
      });
    } catch (error) {
      log.error("Validation error:", error);
      return reply.code(400).send({
        error: "Bad Request",
        message: "Failed to edit transaction",
      });
    }
  } else {
    // If categoryId is not being changed but type is being changed, validate the new type against the existing category
    if (allowedFields.type) {
      try {
        await validateUserTransactionType({
          transactionType: allowedFields.type as Transaction["type"],
          categoryId: transactionToBeUpdated.category.id,
          userId: user.id,
          prisma,
        });
      } catch (error) {
        log.error("Validation error:", error);
        return reply.code(400).send({
          error: "Bad Request",
          message: "Failed to edit transaction",
        });
      }
    }
  }

  try {
    await prisma.transaction.update({
      where: { id: id },
      data: {
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
        ...allowedFields,
      },
    });

    return reply.code(204).send();
  } catch (error) {
    log.error("Error editing transaction:", error);
    return reply.code(400).send({
      error: "Bad Request",
      message: "Failed to edit transaction",
    });
  }
};

export const importTransactionFile = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { server, user } = request;

  const data = await request.file();

  if (!data) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "No file uploaded",
    });
  }

  if (data.mimetype !== "text/csv") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Invalid file type. Only CSV files are allowed.",
    });
  }

  try {
    const { successfulRecords, failedRecords } = await importCsvRecords({
      data,
      userId: user.id,
      prisma: server.prisma,
      log: server.log,
    });

    return reply.send({
      message: "File processed successfully",
      successfulRecords,
      failedRecords,
    });
  } catch (error) {
    server.log.error("Error importing transactions:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};
