import { parse } from "date-fns";

type CsvRecord = {
  type: string;
  date: string;
  amount: string;
  category: string;
  title: string;
};

export function validateRecord(record: CsvRecord) {
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
  record.type = record.type.toLowerCase() === "income" ? "INCOME" : "EXPENSE";

  if (isNaN(parseFloat(record.amount.replace(",", ".")))) {
    throw new Error("Invalid amount format");
  }
  record.amount = parseFloat(record.amount.replace(",", ".")).toFixed(2);

  try {
    const parsedDate = parse(record.date, "dd.MM.yyyy", new Date());
    record.date = parsedDate.toISOString();
  } catch (error) {
    throw error;
  }

  return record;
}
