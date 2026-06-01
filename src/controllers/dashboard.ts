import { captureException } from "@sentry/node";
import { FastifyReply, FastifyRequest } from "fastify";

import { getDashboardStats as getDashboardStatsForUser } from "../services/dashboard";
import { getUserDashboardReports } from "../services/reports";

export const getDashboardStats = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { user, server } = req;
    const stats = await getDashboardStatsForUser(server.prisma, user.id);
    return reply.send(stats);
  } catch (error: unknown) {
    req.log.error("Error fetching dashboard stats:", error);
    captureException(error);
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
    startDateObj.setUTCHours(0, 0, 0, 0);
    const endDateObj = new Date(endDate);
    endDateObj.setUTCHours(23, 59, 59, 999);

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
        startDate: startDateObj,
        endDate: endDateObj,
      }
    );

    return reply.send(reports);
  } catch (e: unknown) {
    req.log.error("Error fetching dashboard reports:", e);
    captureException(e);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};
