import { PrismaClient, RecurringTransaction } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { calculateNextOccurrence } from "../utils/helpers";

type CreateRecurringTransactionInput = Omit<
  RecurringTransaction,
  | "id"
  | "userId"
  | "createdAt"
  | "updatedAt"
  | "nextOccurrence"
  | "isActive"
  | "categoryId"
>;

export const createUserRecurringTransaction = async ({
  userId,
  categoryId,
  prisma,
  recurringTransaction,
}: {
  recurringTransaction: CreateRecurringTransactionInput;
  userId: string;
  categoryId: string;
  prisma: PrismaClient;
}) => {
  let nextOccurrence: Date | null = null;
  try {
    nextOccurrence = calculateNextOccurrence(
      recurringTransaction.recurrenceFrequency,
      recurringTransaction.startDate,
      recurringTransaction.startDate
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

export const getAllActiveRecurringTransactions = async ({
  prisma,
}: {
  prisma: PrismaClient;
}) => {
  try {
    const transactions = await prisma.recurringTransaction.findMany({
      where: { isActive: true, nextOccurrence: { lte: new Date() } },
    });
    return transactions;
  } catch (error) {
    throw new Error(`Failed to fetch recurring transactions: ${error.message}`);
  }
};

export const getUserRecurringTransactions = async ({
  userId,
  prisma,
}: {
  userId: string;
  prisma: PrismaClient;
}) => {
  try {
    const transactions = await prisma.recurringTransaction.findMany({
      where: { userId },
    });
    return transactions;
  } catch (error) {
    throw new Error(`Failed to fetch recurring transactions: ${error.message}`);
  }
};

export const deactivateRecurringTransaction = async ({
  id,
  userId,
  prisma,
}: {
  id: string;
  userId: string;
  prisma: PrismaClient;
}) => {
  try {
    const updated = await prisma.recurringTransaction.update({
      where: { id, userId },
      data: { isActive: false },
    });
    return updated;
  } catch (error) {
    throw new Error(
      `Failed to deactivate recurring transaction: ${error.message}`
    );
  }
};

export const activateRecurringTransaction = async ({
  id,
  userId,
  prisma,
}: {
  id: string;
  userId: string;
  prisma: PrismaClient;
}) => {
  try {
    const recurrenceTransaction = await prisma.recurringTransaction.findUnique({
      where: { id, userId },
    });
    if (!recurrenceTransaction) {
      throw new Error("Recurring transaction not found");
    }
    const nextOccurrence = calculateNextOccurrence(
      recurrenceTransaction.recurrenceFrequency,
      recurrenceTransaction.startDate,
      recurrenceTransaction.nextOccurrence
    );
    const updated = await prisma.recurringTransaction.update({
      where: { id, userId },
      data: { nextOccurrence, isActive: true },
    });

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to activate recurring transaction: ${error.message}`
    );
  }
};

export const deleteUserRecurringTransaction = async ({
  id,
  userId,
  prisma,
}: {
  id: string;
  userId: string;
  prisma: PrismaClient;
}) => {
  try {
    await prisma.recurringTransaction.delete({
      where: { id, userId },
    });
  } catch (error) {
    throw new Error(`Failed to delete recurring transaction: ${error.message}`);
  }
};

type EditRecurringTransactionInput = Omit<
  RecurringTransaction,
  | "id"
  | "userId"
  | "createdAt"
  | "updatedAt"
  | "nextOccurrence"
  | "isActive"
  | "recurrenceFrequency"
>;

export const editUserRecurringTransaction = async ({
  id,
  userId,
  updates,
  prisma,
  log,
}: {
  id: string;
  userId: string;
  updates: Partial<EditRecurringTransactionInput>;
  prisma: PrismaClient;
  log: FastifyBaseLogger;
}) => {
  try {
    const { title, description, endDate, categoryId } = updates;
    const allowedFields: Partial<RecurringTransaction> = {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(endDate ? { endDate } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const recurringTransaction = await prisma.recurringTransaction.findUnique({
      where: { id },
    });

    if (!recurringTransaction) {
      log.error(
        `User ${userId} attempted to edit non-existent recurring transaction ${id}`
      );
      throw new Error("Recurring transaction not found");
    }

    if (recurringTransaction.userId !== userId) {
      log.error(
        `User ${userId} attempted to edit recurring transaction ${id} they do not own`
      );
      throw new Error("Recurring transaction not found");
    }

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        log.error(
          `User ${userId} attempted to use non-existent category ${categoryId}`
        );
        throw new Error("Category not found");
      }
      if (category.userId !== userId) {
        log.error(
          `User ${userId} attempted to use category ${categoryId} they do not own`
        );
        throw new Error("Category not found");
      }

      if (recurringTransaction.type !== category.type) {
        log.error(
          `User ${userId} attempted to change recurring transaction ${id} to category ${categoryId} with mismatched type`
        );
        throw new Error("Category type does not match transaction type");
      }
    }

    const updated = await prisma.recurringTransaction.update({
      where: { id, userId },
      data: allowedFields,
    });
    return updated;
  } catch (error) {
    throw new Error(`Failed to edit recurring transaction: ${error.message}`);
  }
};

export const updateRecurringTransactionNextOccurrence = async ({
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
