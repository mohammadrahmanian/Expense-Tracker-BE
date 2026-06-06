import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";

import {
  createUserTransaction,
  validateUserTransactionType,
} from "../../services/transactions";

import { resolveMcpUser, ToolErrorResult } from "../auth";
import { serializeTransaction } from "../serialize";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const toolError = (text: string): ToolErrorResult => ({
  isError: true,
  content: [{ type: "text", text }],
});

export function registerWriteTools(fastify: FastifyInstance) {
  fastify.mcpAddTool(
    {
      name: "log_transaction",
      description:
        "Create a new transaction (INCOME or EXPENSE) for the user. The agent should call list_categories first to obtain a valid categoryId whose type matches.",
      inputSchema: {
        type: "object",
        properties: {
          amount: { type: "number", exclusiveMinimum: 0 },
          title: { type: "string", minLength: 1, maxLength: 200 },
          type: { type: "string", enum: ["INCOME", "EXPENSE"] },
          categoryId: { type: "string", minLength: 1 },
          date: { type: "string", format: "date-time" },
          description: { type: "string", maxLength: 1000 },
          idempotencyKey: { type: "string", minLength: 1, maxLength: 128 },
        },
        required: ["amount", "title", "type", "categoryId"],
        additionalProperties: false,
      },
    },
    async (params, ctx) => {
      const r = await resolveMcpUser(fastify, ctx.request, ctx.sessionId);
      if ("error" in r) return r.error;

      if (params.idempotencyKey) {
        const existing = await fastify.prisma.transaction.findFirst({
          where: { userId: r.user.id, idempotencyKey: params.idempotencyKey },
        });
        if (existing) return textResult(serializeTransaction(existing as never));
      }

      try {
        await validateUserTransactionType({
          transactionType: params.type,
          categoryId: params.categoryId,
          userId: r.user.id,
          prisma: fastify.prisma,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "validation failed";
        return toolError(`Invalid category for type ${params.type}: ${message}`);
      }

      try {
        const tx = await createUserTransaction({
          prisma: fastify.prisma,
          userId: r.user.id,
          categoryId: params.categoryId,
          transaction: {
            amount: params.amount,
            title: params.title,
            type: params.type,
            description: params.description ?? null,
            date: params.date ? new Date(params.date) : new Date(),
            idempotencyKey: params.idempotencyKey ?? null,
          },
        });
        return textResult(serializeTransaction(tx as never));
      } catch (err) {
        if (
          params.idempotencyKey &&
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          const existing = await fastify.prisma.transaction.findFirst({
            where: { userId: r.user.id, idempotencyKey: params.idempotencyKey },
          });
          if (existing) return textResult(serializeTransaction(existing as never));
        }
        const message = err instanceof Error ? err.message : "create failed";
        fastify.log.error({ err }, "MCP log_transaction failed");
        return toolError(`Failed to create transaction: ${message}`);
      }
    }
  );
}
