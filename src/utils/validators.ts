import { Type } from "@prisma/client";
import { parse } from "date-fns";

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

export function validateRecord(record: CsvRecord): ValidatedRecord {
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

  const parsedDate = parse(record.date, "dd.MM.yyyy", new Date());
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
