export const transactionSchema = {
  $id: "transactionSchema",
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    amount: { type: "number" },
    date: { type: "string" },
    description: { type: "string" },
    categoryId: { type: "string" },
    isRecurring: { type: "boolean" },
    recurrenceFrequency: {
      type: "string",
      enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
    },
    type: { type: "string", enum: ["INCOME", "EXPENSE"] },
  },
};
