export const errorSchema = {
  $id: "errorSchema",
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
    statusCode: { type: "number" },
  },
  required: ["error", "message", "statusCode"],
};