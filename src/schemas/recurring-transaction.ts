export const recurringTransactionSchema = {
  $id: "recurringTransactionSchema",
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    amount: { type: "number" },
    date: { type: "string", format: "date-time" },
    startDate: { type: "string", format: "date-time" },
    endDate: { type: "string", format: "date-time" },
    isActive: { type: "boolean" },
    description: { type: "string" },
    nextOccurrence: { type: "string", format: "date-time" },
    categoryId: { type: "string" },
    recurrenceFrequency: {
      type: "string",
      enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
    },
    type: { type: "string", enum: ["INCOME", "EXPENSE"] },
  },
};
