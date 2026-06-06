import type { FastifyInstance } from "fastify";

import { getDashboardStats } from "../../services/dashboard";
import { getUserTransactions } from "../../services/transactions";
import { getUserDashboardReports } from "../../services/reports";
import { getCategoryInclude } from "../../services/categories";

import { resolveMcpUser } from "../auth";
import {
  serializeCategory,
  serializeTransaction,
  serializeTransactionList,
} from "../serialize";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerReadTools(fastify: FastifyInstance) {
  fastify.mcpAddTool(
    {
      name: "get_dashboard_stats",
      description:
        "Returns the user's total income, total expenses, current balance, and the current month's income/expenses/savings. Use for 'how much money do I have left?' or any account-wide balance question.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    async (_params, ctx) => {
      const r = await resolveMcpUser(fastify, ctx.request, ctx.sessionId);
      if ("error" in r) return r.error;
      const stats = await getDashboardStats(fastify.prisma, r.user.id);
      return textResult(stats);
    }
  );

  fastify.mcpAddTool(
    {
      name: "list_transactions",
      description:
        "List the user's transactions with filters and sorting. Returns items + total count.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          offset: { type: "integer", minimum: 0, default: 0 },
          sort: { type: "string", enum: ["date", "amount"], default: "date" },
          order: { type: "string", enum: ["asc", "desc"], default: "desc" },
          type: { type: "string", enum: ["INCOME", "EXPENSE"] },
          fromDate: { type: "string", format: "date-time" },
          toDate: { type: "string", format: "date-time" },
          categoryId: { type: "string" },
          query: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    async (params, ctx) => {
      const r = await resolveMcpUser(fastify, ctx.request, ctx.sessionId);
      if ("error" in r) return r.error;
      const result = await getUserTransactions({
        userId: r.user.id,
        prisma: fastify.prisma,
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        sort: params.sort ?? "date",
        order: params.order ?? "desc",
        type: params.type,
        fromDate: params.fromDate ? new Date(params.fromDate) : undefined,
        toDate: params.toDate ? new Date(params.toDate) : undefined,
        categoryId: params.categoryId,
        query: params.query,
      });
      return textResult(serializeTransactionList(result));
    }
  );

  fastify.mcpAddTool(
    {
      name: "most_expensive_transaction",
      description:
        "Find the single largest transaction (by amount) for the user, optionally filtered by date range. Defaults to type EXPENSE.",
      inputSchema: {
        type: "object",
        properties: {
          fromDate: { type: "string", format: "date-time" },
          toDate: { type: "string", format: "date-time" },
          type: {
            type: "string",
            enum: ["INCOME", "EXPENSE"],
            default: "EXPENSE",
          },
        },
        additionalProperties: false,
      },
    },
    async (params, ctx) => {
      const r = await resolveMcpUser(fastify, ctx.request, ctx.sessionId);
      if ("error" in r) return r.error;
      const result = await getUserTransactions({
        userId: r.user.id,
        prisma: fastify.prisma,
        limit: 1,
        offset: 0,
        sort: "amount",
        order: "desc",
        type: params.type ?? "EXPENSE",
        fromDate: params.fromDate ? new Date(params.fromDate) : undefined,
        toDate: params.toDate ? new Date(params.toDate) : undefined,
      });
      return textResult(serializeTransaction(result.items[0]));
    }
  );

  fastify.mcpAddTool(
    {
      name: "spending_by_category",
      description:
        "Aggregate the user's transactions by category over a date range. Returns the categoryBreakdown portion of the dashboard report (separate income/expenses arrays).",
      inputSchema: {
        type: "object",
        properties: {
          fromDate: { type: "string", format: "date-time" },
          toDate: { type: "string", format: "date-time" },
        },
        required: ["fromDate", "toDate"],
        additionalProperties: false,
      },
    },
    async (params, ctx) => {
      const r = await resolveMcpUser(fastify, ctx.request, ctx.sessionId);
      if ("error" in r) return r.error;
      const reports = await getUserDashboardReports(
        fastify.prisma,
        fastify.log,
        r.user.id,
        {
          startDate: new Date(params.fromDate),
          endDate: new Date(params.toDate),
        }
      );
      return textResult({
        categoryBreakdown:
          (reports as { categoryBreakdown?: unknown } | undefined)
            ?.categoryBreakdown ?? null,
      });
    }
  );

  fastify.mcpAddTool(
    {
      name: "get_reports",
      description:
        "Returns the full dashboard report for a date range: { summary, monthlyData, categoryBreakdown }. Use for trend questions like 'on which month did I spend most on household?'.",
      inputSchema: {
        type: "object",
        properties: {
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
        },
        required: ["startDate", "endDate"],
        additionalProperties: false,
      },
    },
    async (params, ctx) => {
      const r = await resolveMcpUser(fastify, ctx.request, ctx.sessionId);
      if ("error" in r) return r.error;
      const reports = await getUserDashboardReports(
        fastify.prisma,
        fastify.log,
        r.user.id,
        {
          startDate: new Date(params.startDate),
          endDate: new Date(params.endDate),
        }
      );
      return textResult(reports);
    }
  );

  fastify.mcpAddTool(
    {
      name: "list_categories",
      description:
        "List the user's categories hierarchically. Useful so the agent can resolve a category name to an id before calling log_transaction.",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["INCOME", "EXPENSE"] },
          depth: { type: "integer", minimum: 1, maximum: 5, default: 2 },
        },
        additionalProperties: false,
      },
    },
    async (params, ctx) => {
      const r = await resolveMcpUser(fastify, ctx.request, ctx.sessionId);
      if ("error" in r) return r.error;
      const categories = await fastify.prisma.category.findMany({
        where: {
          userId: r.user.id,
          parentId: null,
          ...(params.type ? { type: params.type } : {}),
        },
        include: getCategoryInclude(params.depth ?? 2),
        orderBy: { name: "asc" },
      });
      return textResult(categories.map((c) => serializeCategory(c as never)));
    }
  );
}
