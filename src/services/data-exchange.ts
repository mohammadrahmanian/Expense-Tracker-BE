import { MultipartFile } from "@fastify/multipart";
import { Category, PrismaClient, Type } from "@prisma/client";
import { captureException } from "@sentry/node";
import { parse } from "csv-parse";
import { parse as ParseDate } from "date-fns";
import { FastifyBaseLogger } from "fastify";

type CsvRecord = {
  type: string;
  date: string;
  amount: string;
  category: string;
  title: string;
};

type ValidatedRecord = CsvRecord & {
  type: Type;
};

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
  const categoryCache = new Map<string, Category>();

  const parser = parse({
    delimiter: ",",
    columns: ["type", "date", "amount", "category", "title"],
  });

  data.file.pipe(parser);

  parser.on("error", (err) => {
    log.error(`Error parsing CSV file: ${err.message}`);
    captureException(err, { level: "error" });
    throw err;
  });

  let failedRecords = 0;
  let successfulRecords = 0;

  for await (const record of parser) {
    try {
      const validatedRecord = validateRecord(record);
      const cacheKey = validatedRecord.category;
      let category = categoryCache.get(cacheKey);
      if (!category) {
        category = await findOrCreateCategory({
          validatedRecord,
          userId,
          prisma,
        });
        categoryCache.set(cacheKey, category);
      }

      if (validatedRecord.type !== category.type) {
        throw new Error(
          `Transaction type (${validatedRecord.type}) must match category type (${category.type})`
        );
      }
      const transaction = await prisma.transaction.create({
        data: {
          ...validatedRecord,
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
    } catch (error: unknown) {
      if (error instanceof Error)
        log.error(`Failed to process record: ${error.message}`);
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

function validateRecord(record: CsvRecord): ValidatedRecord {
  if (
    !record.type ||
    !record.date ||
    !record.amount ||
    !record.category ||
    !record.title
  ) {
    throw new Error("Invalid record format");
  }

  if (!["income", "expense"].includes(record.type.toLowerCase())) {
    throw new Error("Invalid transaction type");
  }

  const validatedType: Type =
    record.type.toLowerCase() === "income" ? "INCOME" : "EXPENSE";

  const normalizedAmount = record.amount.replace(/,/g, ".");
  const parsedAmount = parseFloat(normalizedAmount);
  if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount < 0) {
    throw new Error("Invalid amount format");
  }

  const validatedAmount = parsedAmount.toFixed(2);

  const parsedDate = ParseDate(record.date, "dd.MM.yyyy", new Date());
  const validateDate = parsedDate.toISOString();

  const validatedRecord: ValidatedRecord = {
    amount: validatedAmount,
    type: validatedType,
    date: validateDate,
    category: record.category.trim(),
    title: record.title.trim(),
  };

  return validatedRecord;
}
