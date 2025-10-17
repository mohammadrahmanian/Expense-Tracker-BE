import { PrismaClient } from "@prisma/client";

import { FastifyBaseLogger } from "fastify";

export const getUserDashboardReports = async (
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  userId: string,
  { startDate, endDate }: { startDate: Date; endDate: Date }
) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        category: { select: { name: true, color: true } },
        categoryId: true,
        type: true,
        amount: true,
      },
    });

    const totalIncome = transactions
      .filter((tx) => tx.type === "INCOME")
      .reduce((sum, tx) => sum + tx.amount.toNumber(), 0);

    const totalExpenses = transactions
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + tx.amount.toNumber(), 0);

    const categoryBreakdown: {
      income: {
        categoryId: string;
        categoryName: string;
        color: string;
        amount: number;
      }[];
      expenses: {
        categoryId: string;
        categoryName: string;
        color: string;
        amount: number;
      }[];
    } = {
      income: [],
      expenses: [],
    };

    transactions.forEach((tx) => {
      const { categoryId, category } = tx;

      const targetArray =
        tx.type === "INCOME"
          ? categoryBreakdown.income
          : categoryBreakdown.expenses;

      const existingCategory = targetArray.find(
        (cat) => cat.categoryId === categoryId
      );

      if (existingCategory) {
        existingCategory.amount += tx.amount.toNumber();
      } else {
        targetArray.push({
          categoryId,
          categoryName: category.name,
          color: category.color,
          amount: tx.amount.toNumber(),
        });
      }
    });

    return {
      summary: {
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        netSavings: totalIncome - totalExpenses,
      },
      categoryBreakdown: categoryBreakdown,
    };
  } catch (e) {
    logger.error("Error fetching user dashboard reports:", e);
    throw new Error("Failed to fetch user dashboard reports");
  }
};
