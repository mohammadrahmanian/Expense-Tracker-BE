import { PrismaClient } from "@prisma/client";

import { FastifyBaseLogger } from "fastify";
import {
  getAllActiveRecurringTransactions,
  updateRecurringTransactionNextOccurrence,
} from "../services/recurring-transactions";
import { createUserTransaction } from "../services/transactions";
import { calculateNextOccurrenceOnce } from "../utils/helpers";

export const createTransactionFromRecurringTransaction = async ({
  prisma,
  log,
}: {
  prisma: PrismaClient;
  log: FastifyBaseLogger;
}) => {
  const activeRecurringTransactions = await getAllActiveRecurringTransactions({
    prisma,
  });

  for (const recurringTransaction of activeRecurringTransactions) {
    // update nextOccurrence for each recurring transaction after creating the transaction
    let nextOccurrence: Date;
    try {
      nextOccurrence = calculateNextOccurrenceOnce(
        recurringTransaction.recurrenceFrequency,
        recurringTransaction.startDate,
        recurringTransaction.nextOccurrence
      );
    } catch (error) {
      log.error(
        `Failed to calculate next occurrence for recurring transaction ID ${recurringTransaction.id}: ${error.message}`
      );
      continue; // skip updating this recurring transaction
    }

    await prisma.$transaction(async (tx) => {
      await createUserTransaction({
        transaction: {
          amount: recurringTransaction.amount,
          date: recurringTransaction.nextOccurrence,
          title: recurringTransaction.title,
          description: recurringTransaction.description || undefined,
          type: recurringTransaction.type,
        },
        userId: recurringTransaction.userId,
        categoryId: recurringTransaction.categoryId,
        prisma: tx,
      });

      await updateRecurringTransactionNextOccurrence({
        id: recurringTransaction.id,
        nextOccurrence,
        prisma: tx,
      });
    });
  }
};
