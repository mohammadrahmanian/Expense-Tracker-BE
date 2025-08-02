import { Transaction } from "@prisma/client";
import { parse } from "csv-parse";
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RouteHandlerMethod,
} from "fastify";
import { validateRecord } from "../utils/validators";

type RequestParams = {
  id: string;
};

export const getTransactions: RouteHandlerMethod = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { user, server } = req;
  try {
    const transactions = await server.prisma.transaction.findMany({
      where: { userId: user.id },
    });
    return reply.send(transactions);
  } catch (error) {
    server.log.error("Error fetching transactions:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

export const getTransaction: RouteHandlerMethod = async (
  req: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user, server } = req;
  try {
    const transaction = await server.prisma.transaction.findUnique({
      where: { userId: user.id, id: id },
    });
    if (!transaction) {
      return reply.code(404).send({
        error: "Not Found",
        message: `Transaction with id ${id} not found`,
        statusCode: 404,
      });
    }
    return reply.send(transaction);
  } catch (error) {
    server.log.error("Error fetching transaction:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

export const createTransaction = async (
  req: FastifyRequest<{ Body: Transaction }>,
  reply: FastifyReply
) => {
  const { user, server } = req;

  // Extract only the allowed fields from the request body
  const { title, amount, type, description, categoryId, date } = req.body;
  const allowedFields = {
    title,
    amount,
    type,
    description,
    date,
  };

  try {
    await validateTransactionWithCategory({
      transactionType: allowedFields.type,
      categoryId,
      userId: user.id,
      server,
    });
  } catch (error) {
    server.log.error("Validation error:", error);
    return reply.code(400).send({
      error: "Bad Request",
      message: error.message,
    });
  }

  try {
    const transaction = await server.prisma.transaction.create({
      data: {
        ...allowedFields,
        category: {
          connect: { id: categoryId },
        },
        user: {
          connect: { id: user.id },
        },
      },
    });

    return reply.code(201).send(transaction);
  } catch (error) {
    server.log.error("Error creating transaction:", error);

    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

export const deleteTransaction = async (
  req: FastifyRequest<{ Params: RequestParams }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user, server } = req;
  try {
    await server.prisma.transaction.delete({
      where: { userId: user.id, id: id },
    });

    return reply.code(204).send();
  } catch (error) {
    server.log.error("Error detecting transaction:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

export const editTransaction = async (
  req: FastifyRequest<{ Params: RequestParams; Body: Partial<Transaction> }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user, server } = req;

  const { title, amount, type, description, categoryId, date } = req.body;
  // Create allowedFields object with only scalar fields (excluding categoryId and undefined values)
  const allowedFields = Object.fromEntries(
    Object.entries({
      title,
      amount,
      type,
      description,
      date,
    }).filter(([, value]) => value !== undefined)
  );

  if (categoryId !== undefined) {
    try {
      await validateTransactionWithCategory({
        transactionType: allowedFields.type as Transaction["type"],
        categoryId,
        userId: user.id,
        server,
      });
    } catch (error) {
      server.log.error("Validation error:", error);
      return reply.code(400).send({
        error: "Bad Request",
        message: error.message,
      });
    }
  }

  try {
    await server.prisma.transaction.update({
      where: { userId: user.id, id: id },
      data: {
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
        ...allowedFields,
      },
    });

    return reply.code(204).send();
  } catch (error) {
    server.log.error("Error editing transaction:", error);
    return reply.code(500).send({
      error: "Internal Server Error",
    });
  }
};

const validateTransactionWithCategory = async ({
  transactionType,
  categoryId,
  userId,
  server,
}: {
  transactionType?: Transaction["type"];
  categoryId: string;
  userId: string;
  server: FastifyInstance;
}) => {
  const category = await server.prisma.category.findUnique({
    where: { id: categoryId, userId },
  });
  if (!category) {
    throw new Error(`Category with id ${categoryId} not found`);
  }
  // Ensure the transaction type matches the category type
  if (transactionType && transactionType !== category.type) {
    throw new Error(
      `Transaction type must match category type (${category.type})`
    );
  }
};

export const uploadTransactions = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { server, user } = request;

  const data = await request.file();

  if (!data) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "No file uploaded",
    });
  }

  if (data.mimetype !== "text/csv") {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Invalid file type. Only CSV files are allowed.",
    });
  }

  const parser = parse({
    delimiter: ",",
    columns: ["type", "date", "amount", "category", "title"],
  });

  data.file.pipe(parser);

  let failedRecords = 0;
  let successfulRecords = 0;
  for await (const record of parser) {
    try {
      const validatedRecord = validateRecord(record);
      const findOrCreateCategory = async () => {
        const category = await server.prisma.category.upsert({
          where: {
            name_userId: {
              name: validatedRecord.category,
              userId: user.id,
            },
          },
          update: {},
          create: {
            name: validatedRecord.category,
            type: validatedRecord.type,
            userId: user.id,
          },
        });
        return category;
      };
      const category = await findOrCreateCategory();
      if (validatedRecord.type !== category.type) {
        throw new Error(
          `Transaction type (${validatedRecord.type}) must match category type (${category.type})`
        );
      }
      const transaction = await server.prisma.transaction.create({
        data: {
          ...validatedRecord,
          type: validatedRecord.type,
          user: {
            connect: { id: user.id },
          },
          category: {
            connect: { id: category.id },
          },
        },
      });
      server.log.info(`Transaction created: ${transaction.id}`);
      successfulRecords++;
    } catch (error) {
      server.log.error(`Validation error: ${error.message}`);
      failedRecords++;
    }
  }

  return reply.send({
    message: "File processed successfully",
    successfulRecords,
    failedRecords,
  });
};
