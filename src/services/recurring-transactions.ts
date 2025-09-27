import { PrismaClient, RecurringTransaction } from "@prisma/client";
import { calculateNextOccurrence } from "../utils/helpers";

type RecurringTransactionInput = Omit<
  RecurringTransaction,
  | "id"
  | "userId"
  | "createdAt"
  | "updatedAt"
  | "categoryId"
  | "nextOccurrence"
  | "isActive"
>;

export const createUserRecurringTransaction = async ({
  userId,
  categoryId,
  prisma,
  recurringTransaction,
}: {
  recurringTransaction: RecurringTransactionInput;
  userId: string;
  categoryId: string;
  prisma: PrismaClient;
}) => {
  let nextOccurrence: Date | null = null;
  try {
    nextOccurrence = calculateNextOccurrence(
      recurringTransaction.recurrenceFrequency,
      new Date(),
      new Date()
    );
  } catch (error) {
    throw new Error(`Failed to calculate next occurrence: ${error.message}`);
  }

  try {
    const result = await prisma.recurringTransaction.create({
      data: {
        ...recurringTransaction,
        nextOccurrence,
        isActive: true,
        user: {
          connect: { id: userId },
        },
        category: { connect: { id: categoryId } },
      },
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to create recurring transaction: ${error.message}`);
  }
};

export const getActiveRecurringTransactionsForUser = async ({
  userId,
  prisma,
}: {
  userId: string;
  prisma: PrismaClient;
}) => {
  try {
    const transactions = await prisma.recurringTransaction.findMany({
      where: { userId, isActive: true },
    });
    return transactions;
  } catch (error) {
    throw new Error(`Failed to fetch recurring transactions: ${error.message}`);
  }
};

export const deactivateRecurringTransaction = async ({
  id,
  prisma,
}: {
  id: string;
  prisma: PrismaClient;
}) => {
  try {
    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: { isActive: false },
    });
    return updated;
  } catch (error) {
    throw new Error(
      `Failed to deactivate recurring transaction: ${error.message}`
    );
  }
};

export const updateNextOccurrence = async ({
  id,
  nextOccurrence,
  prisma,
}: {
  id: string;
  nextOccurrence: Date;
  prisma: PrismaClient;
}) => {
  try {
    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: { nextOccurrence },
    });
    return updated;
  } catch (error) {
    throw new Error(`Failed to update next occurrence: ${error.message}`);
  }
};
