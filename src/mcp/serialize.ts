// JSON-safe serializers for Prisma rows surfaced through MCP tool results.
// Decimal(10,2) is safe in a JS number; downstream consumers should treat
// these as 2-decimal money values.

type AnyTx = {
  id: string;
  title: string;
  amount: unknown;
  type: string;
  description: string | null;
  date: Date | string;
  categoryId: string;
  category?: { id: string; name: string; type: string } | null;
};

export function serializeTransaction(tx: AnyTx | null | undefined) {
  if (!tx) return null;
  return {
    id: tx.id,
    title: tx.title,
    amount: Number(tx.amount),
    type: tx.type,
    description: tx.description,
    date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
    categoryId: tx.categoryId,
    category: tx.category
      ? { id: tx.category.id, name: tx.category.name, type: tx.category.type }
      : undefined,
  };
}

export function serializeTransactionList(result: {
  items: AnyTx[];
  total: number;
  count: number;
}) {
  return {
    items: result.items.map(serializeTransaction),
    total: result.total,
    count: result.count,
  };
}

type AnyCategory = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  depth: number;
  budgetAmount: unknown;
  budgetPeriod: string | null;
  children?: AnyCategory[];
};

export function serializeCategory(cat: AnyCategory | null | undefined): unknown {
  if (!cat) return null;
  return {
    id: cat.id,
    name: cat.name,
    type: cat.type,
    description: cat.description,
    color: cat.color,
    icon: cat.icon,
    parentId: cat.parentId,
    depth: cat.depth,
    budgetAmount: cat.budgetAmount != null ? Number(cat.budgetAmount) : null,
    budgetPeriod: cat.budgetPeriod ?? null,
    children: Array.isArray(cat.children)
      ? cat.children.map(serializeCategory)
      : undefined,
  };
}
