import { PrismaClient } from "@prisma/client";

import { captureException } from "@sentry/node";
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
        recurringTransaction.nextOccurrence,
      );
    } catch (error) {
      captureException(error, {
        tags: {
          recurringTransactionId: recurringTransaction.id,
        },
      });
      log.error(
        `Failed to calculate next occurrence for recurring transaction ID ${recurringTransaction.id}: ${error.message}`,
      );
      continue; // skip updating this recurring transaction
    }

    // Stable across retries/concurrent runs: same rule + same occurrence maps
    // to the same key, so the (userId, idempotencyKey) unique constraint blocks
    // duplicate inserts for the same occurrence.
    const idempotencyKey = `recurring:${recurringTransaction.id}:${recurringTransaction.nextOccurrence.toISOString()}`;

    await prisma.$transaction(async (tx) => {
      try {
        await createUserTransaction({
          transaction: {
            amount: recurringTransaction.amount,
            date: recurringTransaction.nextOccurrence,
            title: recurringTransaction.title,
            description: recurringTransaction.description,
            type: recurringTransaction.type,
            idempotencyKey,
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
      } catch (error) {
        captureException(error, {
          tags: {
            recurringTransactionId: recurringTransaction.id,
          },
        });
        throw error;
      }
    });
  }
};
