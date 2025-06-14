export const transactionSchema = {
  $id: "transactionSchema",
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    amount: { type: "number" },
    date: { type: "string" },
    description: { type: "string" },
    category: { type: "string" },
    type: { type: "string", enum: ["income", "expense"] },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};
