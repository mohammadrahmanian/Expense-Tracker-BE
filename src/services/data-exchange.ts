import { MultipartFile } from "@fastify/multipart";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse";
import { FastifyBaseLogger } from "fastify";
import { ValidatedRecord, validateRecord } from "../utils/validators";

export const importCsvRecords = async ({
  data,
  userId,
  prisma,
  log,
}: {
  data: MultipartFile;
  userId: string;
  prisma: PrismaClient;
  log: FastifyBaseLogger;
}) => {
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

      const category = await findOrCreateCategory({
        validatedRecord,
        userId,
        prisma,
      });
      if (validatedRecord.type !== category.type) {
        throw new Error(
          `Transaction type (${validatedRecord.type}) must match category type (${category.type})`
        );
      }
      const transaction = await prisma.transaction.create({
        data: {
          ...validatedRecord,
          type: validatedRecord.type,
          user: {
            connect: { id: userId },
          },
          category: {
            connect: { id: category.id },
          },
        },
      });
      log.info(`Transaction created: ${transaction.id}`);
      successfulRecords++;
    } catch (error) {
      log.error(`Validation error: ${error.message}`);
      failedRecords++;
    }
  }
  return { successfulRecords, failedRecords };
};

async function findOrCreateCategory({
  validatedRecord,
  userId,
  prisma,
}: {
  validatedRecord: ValidatedRecord;
  userId: string;
  prisma: PrismaClient;
}) {
  const category = await prisma.category.upsert({
    where: {
      name_userId: {
        name: validatedRecord.category,
        userId,
      },
    },
    update: {},
    create: {
      name: validatedRecord.category,
      type: validatedRecord.type,
      userId,
    },
  });
  return category;
}