import { Prisma, PrismaClient, Transaction, Type } from "@prisma/client";

type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt" | "userId" | "categoryId"
>;

type SortKey = keyof Pick<Transaction, "date" | "amount">;

export const getUserTransactions = async ({
  userId,
  prisma,
  limit,
  offset,
  sort,
  order,
  type,
  fromDate,
  toDate,
  categoryId,
  query,
}: {
  userId: string;
  prisma: PrismaClient;
  limit?: number;
  offset?: number;
  sort: SortKey;
  order?: "asc" | "desc";
  type?: Type;
  fromDate?: Date;
  toDate?: Date;
  categoryId?: string;
  query?: string;
}) => {
  try {
    return prisma.$transaction(async (tx) => {
      const whereClause: Prisma.TransactionWhereInput = {
        userId,
        ...(type ? { type } : {}),
        ...(fromDate || toDate
          ? {
              date: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const items = await tx.transaction.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: sort
          ? {
              [sort]: order ?? "desc",
            }
          : {
              date: order ?? "desc",
            },
      });
      const total = await tx.transaction.count({
        where: whereClause,
      });

      return {
        items, // transactions in current page
        total, // total matching transactions across all pages
        count: items.length, // number of items in current page
      };
    });
  } catch (error) {
    throw new Error(`Failed to get user transactions: ${error.message}`);
  }
};

export const createUserTransaction = async ({
  transaction,
  userId,
  categoryId,
  prisma,
}: {
  transaction: TransactionInput;
  userId: string;
  categoryId: string;
  prisma: PrismaClient | Prisma.TransactionClient;
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
  const category = await prisma.category.findFirst({
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
