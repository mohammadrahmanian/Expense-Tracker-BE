import { Category, PrismaClient } from "@prisma/client";

const defaultCategories: Pick<Category, "name" | "type" | "color">[] = [
  { name: "Food", type: "EXPENSE", color: "#FF6347" },
  { name: "Transportation", type: "EXPENSE", color: "#4682B4" },
  { name: "Utilities", type: "EXPENSE", color: "#32CD32" },
  { name: "Entertainment", type: "EXPENSE", color: "#FFD700" },
  { name: "Health", type: "EXPENSE", color: "#FF4500" },
  { name: "Household", type: "EXPENSE", color: "#8B4513" },
  { name: "Other Expenses", type: "EXPENSE", color: "#A9A9A9" },
  { name: "Salary", type: "INCOME", color: "#8A2BE2" },
  { name: "Bonus", type: "INCOME", color: "#00CED1" },
  { name: "Refund", type: "INCOME", color: "#FF69B4" },
  { name: "Other Income", type: "INCOME", color: "#20B2AA" },
];

export async function createDefaultCategories(
  prisma: PrismaClient,
  userId: string,
) {
  try {
    await prisma.category.createMany({
      data: defaultCategories.map((category) => ({
        ...category,
        userId,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create default categories: ${message}`);
  }
}
