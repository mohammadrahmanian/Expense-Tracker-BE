import { RecurringTransaction } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import {
  activateRecurringTransaction,
  createUserRecurringTransaction,
  deactivateRecurringTransaction,
  deleteUserRecurringTransaction,
  editUserRecurringTransaction,
  getUserRecurringTransactions,
} from "../services/recurring-transactions";

export const getRecurringTransactions = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { server, user } = req;

  try {
    const recurringTransactions = await getUserRecurringTransactions({
      userId: user.id,
      prisma: server.prisma,
    });
    return reply.send({ recurringTransactions });
  } catch (error) {
    server.log.error("Error fetching recurring transactions", error);
    return reply.status(400).send({
      error: "Failed to fetch recurring transactions",
    });
  }
};

export const createRecurringTransaction = async (
  req: FastifyRequest<{ Body: RecurringTransaction }>,
  reply: FastifyReply
) => {
  const { server, user } = req;
  const data = req.body;

  const {
    title,
    amount,
    type,
    description,
    categoryId,
    recurrenceFrequency,
    startDate,
    endDate,
  } = req.body;
  const allowedFields = {
    title,
    amount,
    type,
    description,
    recurrenceFrequency,
    startDate,
    endDate,
  };

  try {
    // Ensure startDate is a Date object
    if (data.startDate && !(data.startDate instanceof Date)) {
      data.startDate = new Date(data.startDate);
    }

    const newRecurringTransaction = await createUserRecurringTransaction({
      recurringTransaction: allowedFields,
      categoryId,
      userId: user.id,
      prisma: server.prisma,
    });
    return reply.code(201).send(newRecurringTransaction);
  } catch (error) {
    console.log("Error creating recurring transaction:", error);
    server.log.error("Error creating recurring transaction", error);
    return reply.status(400).send({
      error: "Failed to create recurring transaction",
    });
  }
};

type RequestParams = {
  id: string;
};

export const deleteRecurringTransaction = async (
  req: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) => {
  const { user, server } = req;
  const { id } = req.params;
  try {
    await deleteUserRecurringTransaction({
      id,
      userId: user.id,
      prisma: server.prisma,
    });

    return reply.code(204).send();
  } catch (error) {
    server.log.error("Error deleting recurring transaction", error);
    return reply.status(400).send({
      error: "Failed to delete recurring transaction",
    });
  }
};

export const editRecurringTransaction = async (
  req: FastifyRequest<{
    Body: Partial<RecurringTransaction>;
    Params: RequestParams;
  }>,
  reply: FastifyReply
) => {
  const { user, server } = req;
  const { id } = req.params;
  const updates = req.body;
  if (!updates) {
    return reply.status(400).send({ error: "No updates provided" });
  }
  try {
    await editUserRecurringTransaction({
      id,
      userId: user.id,
      updates,
      prisma: server.prisma,
      log: server.log,
    });
    return reply.code(204).send();
  } catch (error) {
    server.log.error("Error editing recurring transaction", error);
    return reply.status(400).send({
      error: "Failed to edit recurring transaction",
    });
  }
};

export const toggleRecurringTransaction = async (
  req: FastifyRequest<{ Body: { active: boolean }; Params: RequestParams }>,
  reply: FastifyReply
) => {
  const { user, server } = req;
  const { active } = req.body;
  const { id } = req.params;
  try {
    if (active) {
      await activateRecurringTransaction({
        id,
        userId: user.id,
        prisma: server.prisma,
      });
      return reply.code(204).send();
    }

    if (!active) {
      await deactivateRecurringTransaction({
        id,
        userId: user.id,
        prisma: server.prisma,
      });
      return reply.code(204).send();
    }
  } catch (error) {
    server.log.error("Error toggling recurring transaction", error);
    return reply.status(400).send({
      error: "Failed to toggle recurring transaction",
    });
  }
};
