import { PrismaClient } from "@prisma/client";

export const getDashboardStats = async (
  prisma: PrismaClient,
  userId: string
) => {
  const now = new Date();
  const firstOfTheMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const totalIncomeResult = await prisma.transaction.aggregate({
    where: { userId, type: "INCOME" },
    _sum: { amount: true },
  });

  const totalExpensesResult = await prisma.transaction.aggregate({
    where: { userId, type: "EXPENSE" },
    _sum: { amount: true },
  });

  const monthlyIncomeResult = await prisma.transaction.aggregate({
    where: { userId, type: "INCOME", date: { gte: firstOfTheMonth } },
    _sum: { amount: true },
  });

  const monthlyExpensesResult = await prisma.transaction.aggregate({
    where: { userId, type: "EXPENSE", date: { gte: firstOfTheMonth } },
    _sum: { amount: true },
  });

  const totalIncome = Number(totalIncomeResult._sum.amount) || 0;
  const totalExpenses = Number(totalExpensesResult._sum.amount) || 0;
  const monthlyIncome = Number(monthlyIncomeResult._sum.amount) || 0;
  const monthlyExpenses = Number(monthlyExpensesResult._sum.amount) || 0;

  return {
    totalIncome,
    totalExpenses,
    currentBalance: totalIncome - totalExpenses,
    monthlyIncome,
    monthlyExpenses,
    monthlySaving: monthlyIncome - monthlyExpenses,
  };
};
