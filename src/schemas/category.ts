export const categorySchema = {
  $id: "categorySchema",
  type: "object",
  properties: {
    id: {
      type: "string",
      format: "uuid",
      description: "Unique identifier for the category",
    },
    name: {
      type: "string",
      description: "Name of the category",
    },
    type: {
      type: "string",
      enum: ["income", "expense"],
      description: "Type of the category, either income or expense",
    },
    description: {
      type: "string",
      description: "Description of the category",
      nullable: true,
    },
    parentId: {
      type: "string",
      format: "uuid",
      description: "ID of the parent category, if any",
      nullable: true,
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Timestamp when the category was created",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Timestamp when the category was last updated",
    },
  },
};
