import { Category, Type } from "@prisma/client";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CATEGORY_CONFIG } from "../config/constants.js";
import { CategoryWithChildren } from "../types/category.js";

const getCategoryInclude = (
  depth: number = CATEGORY_CONFIG.MAX_QUERY_DEPTH
) => {
  if (depth <= 0) return {};

  return {
    children: {
      take: 20, // Limit number of children per level
      include: depth > 1 ? getCategoryInclude(depth - 1) : {},
    },
  };
};

// TODO: Store and manage category depth per category in the database for efficiency
const getParentDepth = async (
  categoryId: string,
  server: FastifyInstance,
  userId: string
) => {
  const category = await server.prisma.category.findUnique({
    where: { id: categoryId, userId },
    include: {
      parent: true,
    },
  });
  if (!category) {
    throw new Error("Category not found");
  }

  if (!category.parent) return 0;

  return 1 + (await getParentDepth(category.parent.id, server, userId));
};

const getChildrenDepth = (category: CategoryWithChildren) => {
  if (!category.children) return 0;
  if (category.children.length === 0) return 0;
  return 1 + Math.max(...category.children.map(getChildrenDepth));
};

const getFlattenedCategories = (
  category: CategoryWithChildren
): CategoryWithChildren[] => {
  if (!category.children) return [category];
  return [category, ...category.children.flatMap(getFlattenedCategories)];
};

const validateCategoryWithParent = async ({
  userId,
  parentId,
  categoryType,
  server,
  categoryId,
}: {
  userId: string;
  parentId: string;
  categoryType: Category["type"];
  server: FastifyInstance;
  categoryId?: string;
}) => {
  const parentCategory = await server.prisma.category.findUnique({
    where: { id: parentId, userId: userId },
  });

  if (!parentCategory) {
    throw new Error("Parent category not found or does not belong to user");
  }

  if (categoryType !== parentCategory.type) {
    throw new Error("Category type must match parent category type");
  }

  // Prevent circular references
  if (categoryId) {
    if (parentId === categoryId)
      throw new Error("Category cannot be its own parent");
    const category = await server.prisma.category.findUnique({
      where: { userId: userId, id: categoryId },
      include: getCategoryInclude(10),
    });

    const flattenedCategories = getFlattenedCategories(category);
    if (flattenedCategories.some((cat) => cat.id === parentId)) {
      throw new Error("Child category cannot be a parent");
    }
  }
  return true;
};

export const getCategories = async (
  req: FastifyRequest<{
    Querystring: {
      depth?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { user, server } = req;

    const depth = req.query.depth
      ? parseInt(req.query.depth, 10)
      : CATEGORY_CONFIG.MAX_QUERY_DEPTH;
    const queryDepth = Math.min(depth, CATEGORY_CONFIG.MAX_QUERY_DEPTH);
    const userCategories = await server.prisma.category.findMany({
      where: { userId: user.id },
      include: getCategoryInclude(queryDepth),
      orderBy: { createdAt: "desc" },
    });
    return reply.send(userCategories);
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getCategoryById = async (
  req: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      depth?: string;
    };
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const { user, server } = req;

    const depth = req.query.depth
      ? parseInt(req.query.depth, 10)
      : CATEGORY_CONFIG.MAX_QUERY_DEPTH;

    const queryDepth = Math.min(depth, CATEGORY_CONFIG.MAX_QUERY_DEPTH);
    const category = await server.prisma.category.findUnique({
      where: { userId: user.id, id: id },
      include: getCategoryInclude(queryDepth),
    });

    if (!category) {
      return reply.status(404).send({ error: "Category not found" });
    }

    return reply.send(category);
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const createCategory = async (
  req: FastifyRequest<{ Body: Category }>,
  reply: FastifyReply
) => {
  try {
    const { user, server } = req;

    // Extract only the allowed fields from the request body
    const { name, type, description, color, icon, parentId } = req.body;

    // Create allowedFields object with only valid Category fields
    const allowedFields = {
      name,
      type,
      description,
      color,
      icon,
    };

    if (parentId) {
      await validateCategoryWithParent({
        userId: user.id,
        parentId,
        categoryType: allowedFields.type,
        server,
      });
      const parentDepth = await getParentDepth(parentId, server, user.id);
      if (parentDepth > CATEGORY_CONFIG.MAX_NESTING_DEPTH) {
        return reply
          .status(400)
          .send({ error: "Parent category depth exceeds maximum allowed" });
      }
    }

    const category = await server.prisma.category.create({
      data: {
        ...allowedFields,
        user: {
          connect: { id: user.id },
        },
        parent: parentId
          ? {
              connect: { id: parentId },
            }
          : undefined,
      },
    });

    return reply.status(201).send(category);
  } catch (error) {
    req.log.error(error);
    if (error instanceof Error) {
      return reply.status(400).send({ error: error.message });
    } else {
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
};

type EditCategoryBody = Partial<Category>;

export const editCategory = async (
  req: FastifyRequest<{ Body: EditCategoryBody; Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { user, server } = req;
    const { id } = req.params;

    // Extract only the allowed fields from the request body
    const { name, type, description, color, icon, parentId } = req.body;

    // Create allowedFields object with only valid Category fields (excluding undefined values)
    const allowedFields = Object.fromEntries(
      Object.entries({ name, type, description, color, icon }).filter(
        ([, value]) => value !== undefined
      )
    );

    if (parentId) {
      // Get current category to determine type if not provided in update
      const currentCategory = await server.prisma.category.findUnique({
        where: { id: id, userId: user.id },
        include: getCategoryInclude(10),
      });

      if (!currentCategory) {
        return reply.status(404).send({ error: "Category not found" });
      }

      await validateCategoryWithParent({
        userId: user.id,
        parentId,
        categoryType: (allowedFields.type as Type) || currentCategory.type,
        server,
        categoryId: id,
      });

      const parentDepth = await getParentDepth(parentId, server, user.id);
      const childrenDepth = getChildrenDepth(currentCategory);

      if (childrenDepth + parentDepth > CATEGORY_CONFIG.MAX_NESTING_DEPTH) {
        return reply
          .status(400)
          .send({ error: "Category depth exceeds maximum allowed" });
      }
    }

    const editedCategory = await server.prisma.category.update({
      where: { id: id, userId: user.id },
      data: {
        ...allowedFields,
        ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
      },
    });

    return reply.send(editedCategory);
  } catch (error) {
    req.log.error(error);
    if (error instanceof Error) {
      return reply.status(400).send({ error: error.message });
    } else {
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
};

export const deleteCategory = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user, server } = req;
  try {
    const category = await server.prisma.category.delete({
      where: { id: id, userId: user.id },
    });

    return reply.code(204).send();
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  }
};
