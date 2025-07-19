import { FastifyReply, FastifyRequest } from "fastify";

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

    return reply.send({
      totalIncome,
      totalExpenses,
    });
  } catch (error) {
    req.log.error("Error fetching dashboard stats:", error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
