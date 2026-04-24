import { Category, PrismaClient, Type } from "@prisma/client";
import { captureException } from "@sentry/node";
import { CATEGORY_CONFIG } from "../config/constants";
import { CategoryWithChildren } from "../types/category";

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

const validateColorString = (color: string): boolean => {
  const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
  return hexColorRegex.test(color);
};

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

type CategoryIncludes = {
  children: {
    take: number;
    include: CategoryIncludes;
  };
};

export const getCategoryInclude = (
  depth: number = CATEGORY_CONFIG.MAX_QUERY_DEPTH,
): CategoryIncludes | {} => {
  if (depth <= 0) return {};

  return {
    children: {
      take: 20, // Limit number of children per level
      include: depth > 1 ? getCategoryInclude(depth - 1) : {},
    },
  };
};

export const getCategoryDepth = async ({
  categoryId,
  prisma,
  userId,
}: {
  categoryId: string;
  prisma: PrismaClient;
  userId: string;
}) => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId, userId },
    include: {
      parent: true,
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return category?.depth || 0;
};

export const getChildrenDepth = (category: CategoryWithChildren): number => {
  if (!category.children || category.children.length === 0)
    return category.depth;
  return Math.max(...category.children.map(getChildrenDepth));
};

const getFlattenedCategories = (
  category: CategoryWithChildren,
): CategoryWithChildren[] => {
  if (!category.children) return [category];
  return [category, ...category.children.flatMap(getFlattenedCategories)];
};

/**
 * Checks if a category can be a valid parent.
 * This includes checking if the parent category exists, belongs to the same user, has the same type, and does not create a circular reference.
 * @param userId - The ID of the user
 * @param parentId - The ID of the potential parent category
 * @param categoryType - The type of the category being created or updated
 * @param prisma - The Prisma client instance
 * @param categoryId - The ID of the category being updated (optional, only needed for updates)
 * @returns An object indicating if the parent is valid and the parent category data if valid
 * @throws An error if the parent category is invalid or if any validation checks fail
 */
export const checkIfCanBeValidParent = async ({
  userId,
  parentId,
  categoryType,
  prisma,
  categoryId,
}: {
  userId: string;
  parentId: string;
  categoryType: Category["type"];
  prisma: PrismaClient;
  categoryId?: string;
}): Promise<
  | {
      valid: true;
      parentCategory: Category;
    }
  | {
      valid: false;
      message: string;
    }
> => {
  const parentCategory = await prisma.category.findUnique({
    where: { id: parentId, userId: userId },
  });

  if (!parentCategory) {
    return {
      valid: false,
      message: "Parent not found or does not belong to user",
    };
  }

  if (categoryType !== parentCategory.type) {
    return { valid: false, message: "Category type must match parent type" };
  }

  // Prevent circular references. Happens when updating a category's parent to one of its own children or itself.
  // Only need to check for updates, not creation, since a new category cannot have children yet.
  if (categoryId) {
    if (parentId === categoryId)
      return { valid: false, message: "Category cannot be its own parent" };
    const category = await prisma.category.findUnique({
      where: { userId: userId, id: categoryId },
      include: getCategoryInclude(10),
    });

    if (category === null) {
      return {
        valid: false,
        message: "Category being updated not found",
      };
    }

    const flattenedCategories = getFlattenedCategories(category);
    if (flattenedCategories.some((cat) => cat.id === parentId)) {
      return {
        valid: false,
        message: "Child category cannot be a parent for its own ancestor",
      };
    }
  }
  return { valid: true, parentCategory };
};

/**
 * Creates a new category.
 * @param prisma - The Prisma client instance
 * @param userId - The ID of the user creating the category
 * @param parentId - The ID of the parent category (optional)
 * @param allowedFields - The fields allowed for the category - name, type, icon, color, budgetAmount, and budgetPeriod
 * @returns The created category
 * @throws An error if the category cannot be created
 * Validation checks include:
 * - If budgetAmount is provided, budgetPeriod must also be provided, and vice versa
 * - If parentId is provided, the parent category must exist, belong to the same user, have the same type, and not create a circular reference
 * - The depth of the category must not exceed the maximum allowed nesting depth
 */
export const createCategory = async ({
  prisma,
  userId,
  parentId,
  allowedFields,
}: {
  prisma: PrismaClient;
  userId: string;
  parentId: string | null;
  allowedFields: Pick<
    Category,
    "name" | "type" | "icon" | "color" | "budgetAmount" | "budgetPeriod"
  >;
}) => {
  if (
    (allowedFields.budgetAmount && !allowedFields.budgetPeriod) ||
    (!allowedFields.budgetAmount && allowedFields.budgetPeriod)
  ) {
    throw new Error(
      "budgetAmount and budgetPeriod must be provided together or not at all",
      { cause: "VALIDATION_ERROR" },
    );
  }

  let depth = 0;

  if (parentId) {
    // Checks for valid parent category, circular references, and also retrieves the parent's depth to calculate the new category's depth
    const parentValidityResult = await checkIfCanBeValidParent({
      parentId,
      categoryType: allowedFields.type,
      userId,
      prisma,
    });
    if (!parentValidityResult.valid) {
      throw new Error(parentValidityResult.message, {
        cause: "VALIDATION_ERROR",
      });
    }

    const parentDepth = parentValidityResult.parentCategory.depth;
    depth = parentDepth + 1;

    if (depth > CATEGORY_CONFIG.MAX_NESTING_DEPTH) {
      throw new Error("Depth exceeds maximum allowed", {
        cause: "VALIDATION_ERROR",
      });
    }
  }

  const category = await prisma.category.create({
    data: {
      ...allowedFields,
      depth,
      user: {
        connect: { id: userId },
      },
      parent: parentId
        ? {
            connect: { id: parentId },
          }
        : undefined,
    },
  });

  return category;
};

export const editCategory = async ({
  categoryId,
  prisma,
  userId,
  parentId,
  allowedFields,
}: {
  categoryId: string;
  prisma: PrismaClient;
  userId: string;
  parentId?: string | null;
  allowedFields: Partial<
    Pick<
      Category,
      "name" | "type" | "icon" | "color" | "budgetAmount" | "budgetPeriod"
    >
  >;
}) => {
  if (
    (allowedFields.budgetAmount && !allowedFields.budgetPeriod) ||
    (!allowedFields.budgetAmount && allowedFields.budgetPeriod)
  ) {
    throw new Error(
      "budgetAmount and budgetPeriod must be provided together or not at all",
      { cause: "VALIDATION_ERROR" },
    );
  }

  if (parentId) {
    // Get current category to determine type if not provided in update
    const currentCategory = await getCategory({
      categoryId,
      userId,
      prisma,
      withChildren: true,
    });

    if (currentCategory === null) {
      return null;
    }

    const parentValidityResult = await checkIfCanBeValidParent({
      userId,
      parentId,
      categoryType: (allowedFields.type as Type) || currentCategory.type,
      prisma,
      categoryId,
    });

    if (!parentValidityResult.valid) {
      throw new Error(parentValidityResult.message, {
        cause: "VALIDATION_ERROR",
      });
    }

    const parentDepth = parentValidityResult.parentCategory.depth;
    const childrenDepth = getChildrenDepth(currentCategory);
    const newDepth = parentDepth + 1;
    const depthDelta = newDepth - currentCategory.depth;

    const newMaxDepth = newDepth + (childrenDepth - currentCategory.depth);
    if (newMaxDepth > CATEGORY_CONFIG.MAX_NESTING_DEPTH) {
      throw new Error("Depth exceeds maximum allowed", {
        cause: "VALIDATION_ERROR",
      });
    }

    // Update the category and all descendants' depths in a transaction
    const descendants = getFlattenedCategories(currentCategory);
    const editedCategory = await prisma.$transaction([
      prisma.category.update({
        where: { id: categoryId, userId },
        data: {
          ...allowedFields,
          depth: newDepth,
          parent: { connect: { id: parentId } },
        },
      }),
      ...descendants
        .filter((cat) => cat.id !== categoryId)
        .map((cat) =>
          prisma.category.update({
            where: { id: cat.id },
            data: { depth: cat.depth + depthDelta },
          }),
        ),
    ]);

    return editedCategory[0];
  }

  const editedCategory = await prisma.category.update({
    where: { id: categoryId, userId },
    data: {
      ...allowedFields,
    },
  });

  return editedCategory;
};

export const getCategory = async ({
  prisma,
  userId,
  categoryId,
  withChildren = false,
}: {
  prisma: PrismaClient;
  userId: string;
  categoryId: string;
  // Should add all children to be able to calculate the children depth
  withChildren?: boolean;
}) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId, userId },
      include: withChildren
        ? getCategoryInclude(CATEGORY_CONFIG.MAX_NESTING_DEPTH)
        : {},
    });

    return category;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    captureException(error);
    throw new Error(`Failed to get category: ${message}`);
  }
};
