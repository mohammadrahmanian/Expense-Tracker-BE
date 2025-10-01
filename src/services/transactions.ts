import { PrismaClient, Transaction } from "@prisma/client";

type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt" | "userId" | "categoryId"
>;

export const createUserTransaction = async ({
  transaction,
  userId,
  categoryId,
  prisma,
}: {
  transaction: TransactionInput;
  userId: string;
  categoryId: string;
  prisma: PrismaClient;
}) => {
  try {
    const createdTransaction = await prisma.transaction.create({
      data: {
        ...transaction,
        category: {
          connect: { id: categoryId },
        },
        user: {
          connect: { id: userId },
        },
      },
    });

    return createdTransaction;
  } catch (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
};

export const validateUserTransactionType = async ({
  transactionType,
  categoryId,
  userId,
  prisma,
}: {
  transactionType: Transaction["type"];
  categoryId: string;
  userId: string;
  prisma: PrismaClient;
}) => {
  const category = await prisma.category.findUnique({
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
