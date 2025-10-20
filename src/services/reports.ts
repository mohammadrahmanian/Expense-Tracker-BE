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
        date: true,
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

      if (!category) {
        logger.warn(
          `Transaction has null or invalid category reference, skipping: ${categoryId}`
        );
        return;
      }

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
          color: category.color ?? "#808080",
          amount: tx.amount.toNumber(),
        });
      }
    });

    const monthlyData: {
      month: string;
      monthLabel: string;
      income: number;
      expenses: number;
      savings: number;
    }[] = [];

    transactions.forEach((tx) => {
      const year = tx.date.getUTCFullYear();
      const monthNum = tx.date.getUTCMonth() + 1;
      const month = `${year}-${String(monthNum).padStart(2, "0")}`;
      const monthLabel = new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });


      let monthlyEntry = monthlyData.find((entry) => entry.month === month);
      if (!monthlyEntry) {
        monthlyEntry = {
          month,
          monthLabel,
          income: 0,
          expenses: 0,
          savings: 0,
        };
        monthlyData.push(monthlyEntry);
      }

      if (tx.type === "INCOME") {
        monthlyEntry.income += tx.amount.toNumber();
      } else {
        monthlyEntry.expenses += tx.amount.toNumber();
      }

      monthlyEntry.savings = monthlyEntry.income - monthlyEntry.expenses;
    });
    monthlyData.sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary: {
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        netSavings: totalIncome - totalExpenses,
      },
      monthlyData,
      categoryBreakdown: categoryBreakdown,
    };
  } catch (e) {
    logger.error("Error fetching user dashboard reports:", e);
    throw new Error("Failed to fetch user dashboard reports");
  }
};
