import { Category } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { getChildrenDepth } from "./categories";

describe("getChildrenDepth", () => {
  test("should return the correct depth for a category with no children", () => {
    const category: Category & { children: Category[] } = {
      id: "1",
      name: "Root Category",
      depth: 0,
      type: "EXPENSE",
      userId: "user1",
      icon: null,
      color: null,
      description: null,
      budgetAmount: null,
      budgetPeriod: null,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      children: [],
    };
    expect(getChildrenDepth(category)).toBe(0);
  });
});
