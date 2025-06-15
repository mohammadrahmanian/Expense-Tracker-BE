export const userSchema = {
  $id: "userSchema",
  type: "object",
  properties: {
    id: { type: "string" },
    password: { type: "string" },
    email: { type: "string", format: "email" },
  },
};
