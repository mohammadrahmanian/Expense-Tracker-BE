import { Category } from "@prisma/client";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { CATEGORY_CONFIG } from "../config/constants.js";

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
  if (categoryId && parentId === categoryId) {
    throw new Error("Category cannot be its own parent");
  }
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
    const userCategories = await server.prisma.category.findMany({
      where: { userId: user.id },
      include: getCategoryInclude(queryDepth),
      orderBy: { createdAt: 'desc' }
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

    const category = await server.prisma.category.findUnique({
      where: { userId: user.id, id: id },
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

    const {
      id: _,
      userId: __,
      createdAt: ___,
      updatedAt: ____,
      parentId,
      ...allowedFields
    } = req.body;

    if (parentId) {
      await validateCategoryWithParent({
        userId: user.id,
        parentId,
        categoryType: allowedFields.type,
        server,
      });
    }

    // TODO: check category recursive relationship with parent, siblings, and siblings children
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

    const {
      id: _,
      userId: __,
      createdAt: ___,
      updatedAt: ____,
      parentId,
      ...allowedFields
    } = req.body;

    if (parentId) {
      // Get current category to determine type if not provided in update
      const currentCategory = await server.prisma.category.findUnique({
        where: { id: id, userId: user.id },
        select: { type: true },
      });

      if (!currentCategory) {
        return reply.status(404).send({ error: "Category not found" });
      }

      await validateCategoryWithParent({
        userId: user.id,
        parentId,
        categoryType: allowedFields.type || currentCategory.type,
        server,
        categoryId: id,
      });
    }

    // TODO: check category recursive relationship with parent, siblings, and siblings children
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

    if (!category) {
      return reply.status(404).send({ error: "Category not found" });
    }

    return reply.code(204).send();
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  }
};
