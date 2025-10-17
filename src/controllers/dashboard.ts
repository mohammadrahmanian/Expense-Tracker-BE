import { FastifyReply, FastifyRequest } from "fastify";
import { getUserDashboardReports } from "../services/reports";

export const getDashboardStats = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { user, server } = req;

    // Calculate total income (transactions with type INCOME)
    const totalIncomeResult = await server.prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: "INCOME",
      },
      _sum: {
        amount: true,
      },
    });

    const firstOfTheMonth = new Date();
    firstOfTheMonth.setDate(1);
    firstOfTheMonth.setHours(0, 0, 0, 0);

    const monthlyIncomeResult = await server.prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: "INCOME",
        date: {
          gte: firstOfTheMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const monthlyExpensesResult = await server.prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: firstOfTheMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate total expenses (transactions with type EXPENSE)
    const totalExpensesResult = await server.prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
      },
      _sum: {
        amount: true,
      },
    });

    // Convert Decimal to number, default to 0 if null
    const totalIncome = Number(totalIncomeResult._sum.amount) || 0;
    const totalExpenses = Number(totalExpensesResult._sum.amount) || 0;
    const currentBalance = totalIncome - totalExpenses;
    const monthlyIncome = Number(monthlyIncomeResult._sum.amount) || 0;
    const monthlyExpenses = Number(monthlyExpensesResult._sum.amount) || 0;
    const monthlySaving = monthlyIncome - monthlyExpenses;

    return reply.send({
      totalIncome,
      totalExpenses,
      currentBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySaving,
    });
  } catch (error) {
    req.log.error("Error fetching dashboard stats:", error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getDashboardReports = async (
  req: FastifyRequest<{
    Querystring: { startDate?: string; endDate?: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { user, server } = req;

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return reply
        .status(400)
        .send({ error: "startDate and endDate are required" });
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime())) {
      return reply.status(400).send({ error: "Invalid startDate format" });
    }

    if (isNaN(endDateObj.getTime())) {
      return reply.status(400).send({ error: "Invalid endDate format" });
    }

    if (startDateObj > endDateObj) {
      return reply
        .status(400)
        .send({ error: "startDate cannot be after endDate" });
    }

    const reports = await getUserDashboardReports(
      server.prisma,
      server.log,
      user.id,
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    );

    return reply.send(reports);
  } catch (e) {
    req.log.error("Error fetching dashboard reports:", e);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
