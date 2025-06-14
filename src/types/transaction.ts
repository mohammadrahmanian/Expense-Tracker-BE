export type Transaction = {
  id: string;
  userId: string;
  title: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  createdAt: string;
  updatedAt: string;
};

export type TransactionType = "income" | "expense";
