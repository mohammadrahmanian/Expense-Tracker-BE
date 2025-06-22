export type Category = {
  id: string;
  userId: string;
  name: string;
  type: "income" | "expense";
  description?: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
};
