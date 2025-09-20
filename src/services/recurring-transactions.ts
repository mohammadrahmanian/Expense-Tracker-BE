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
