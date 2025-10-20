import { FastifyInstance } from "fastify";
import {
  getDashboardReports,
  getDashboardStats,
} from "../controllers/dashboard";

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

const getDashboardReportsOpts = {
  schema: {
    querystring: {
      type: "object",
      properties: {
        startDate: { type: "string", format: "date" },
        endDate: { type: "string", format: "date" },
      },
      required: ["startDate", "endDate"],
    },
    response: {
      200: {
        type: "object",
        properties: {
          summary: {
            type: "object",
            properties: {
              totalIncome: { type: "number", example: 50000 },
              totalExpenses: { type: "number", example: 35000 },
              netSavings: { type: "number", example: 15000 },
            },
            description: "Summary report of the dashboard",
          },
          monthlyData: {
            type: "array",
            items: {
              type: "object",
              properties: {
                month: { type: "string", example: "2024-08" },
                monthLabel: { type: "string", example: "Aug 2024" },
                income: { type: "number", example: 8500 },
                expenses: { type: "number", example: 6200 },
                savings: { type: "number", example: 2300 },
              },
            },
          },
          categoryBreakdown: {
            type: "object",
            properties: {
              expenses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    categoryId: { type: "string", example: "cat-123" },
                    categoryName: { type: "string", example: "Food & Dining" },
                    color: { type: "string", example: "#FF6B6B" },
                    amount: { type: "number", example: 12500 },
                  },
                },
              },
              income: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    categoryId: { type: "string", example: "cat-456" },
                    categoryName: { type: "string", example: "Salary" },
                    color: { type: "string", example: "#4ECDC4" },
                    amount: { type: "number", example: 30000 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  handler: getDashboardReports,
};

export const dashboardRoutes = (fastify: FastifyInstance, options, done) => {
  fastify.get("/dashboard/stats", {
    ...getDashboardStatsOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.get("/dashboard/reports", {
    ...getDashboardReportsOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  done();
};
