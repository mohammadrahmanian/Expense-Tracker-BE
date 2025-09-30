import { FastifyReply, FastifyRequest } from "fastify";
import { getUserRecurringTransactions } from "../services/recurring-transactions";

export const getRecurringTransactions = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { server, user } = req;

  try {
    const recurringTransactions = await getUserRecurringTransactions({
      userId: user.id,
      prisma: server.prisma,
    });
    return reply.send({ recurringTransactions });
  } catch (error) {
    return reply.status(500).send({ error: error.message });
  }
};
