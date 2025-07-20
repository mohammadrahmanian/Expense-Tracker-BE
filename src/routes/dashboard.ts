import { FastifyInstance } from "fastify";
import { getDashboardStats } from "../controllers/dashboard";

const getDashboardStatsOpts = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          totalIncome: {
            type: "number",
            description: "Total income from all INCOME transactions",
          },
          totalExpenses: {
            type: "number",
            description: "Total expenses from all EXPENSE transactions",
          },
          currentBalance: {
            type: "number",
            description:
              "Current balance calculated as total income minus total expenses",
          },
          monthlyIncome: {
            type: "number",
            description: "Total income for the current month",
          },
          monthlyExpenses: {
            type: "number",
            description: "Total expenses for the current month",
          },
          monthlySaving: {
            type: "number",
            description:
              "Monthly saving calculated as monthly income minus monthly expenses",
          },
        },
        required: ["totalIncome", "totalExpenses"],
      },
      500: { $ref: "errorSchema#" },
    },
  },
  handler: getDashboardStats,
};

export const dashboardRoutes = (fastify: FastifyInstance, options, done) => {
  fastify.get("/dashboard/stats", {
    ...getDashboardStatsOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  done();
};
