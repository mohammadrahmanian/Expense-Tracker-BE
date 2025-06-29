import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { Category } from "@prisma/client";

export const getCategories = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { user, server } = req;
  const userCategories = await server.prisma.category.findMany({
    where: { userId: user.id },
  });
  return reply.send(userCategories);
};

export const getCategoryById = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user, server } = req;
  const category = await server.prisma.category.findUnique({
    where: { userId: user.id, id: id },
  });

  if (!category) {
    return reply.status(404).send({ error: "Category not found" });
  }

  return reply.send(category);
};

export const createCategory = async (
  req: FastifyRequest<{ Body: Category }>,
  reply: FastifyReply
) => {
  const { user, server } = req;

  // TODO: Validate and sanitize the request body
  const {
    id: _,
    userId: __,
    createdAt: ___,
    updatedAt: ____,
    parentId,
    ...allowedFields
  } = req.body;

  try {
    validateCategoryWithParent({
      userId: user.id,
      parentId,
      categoryType: allowedFields.type,
      server,
    });
  } catch (error) {
    console.error("Error checking parent category:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }

  try {
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

    if (!category) {
      return reply.status(400).send({ error: "Failed to create category" });
    }

    return reply.status(201).send(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
};

type EditCategoryBody = Partial<Category>;

export const editCategory = async (
  req: FastifyRequest<{ Body: EditCategoryBody; Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { user, server } = req;
  const { id } = req.params;

  // TODO: Validate and sanitize the request body
  const {
    id: _,
    userId: __,
    createdAt: ___,
    updatedAt: ____,
    parentId,
    ...allowedFields
  } = req.body;

  if (allowedFields.type) {
    try {
      validateCategoryWithParent({
        userId: user.id,
        parentId,
        categoryType: allowedFields.type,
        server,
      });
    } catch (error) {
      console.error("Error checking parent category:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  }

  const editedCategory = await server.prisma.category.update({
    where: { id: id, userId: user.id },
    data: {
      ...allowedFields,
      ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
    },
  });

  if (!editedCategory) {
    return reply.status(404).send({ error: "Category not found" });
  }

  return reply.code(204).send();
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
    console.error("Error deleting category:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
};

const validateCategoryWithParent = async ({
  userId,
  parentId,
  categoryType,
  server,
}: {
  userId: string;
  parentId: string;
  categoryType: Category["type"];
  server: FastifyInstance;
}) => {
  const parentCategory = await server.prisma.category.findUnique({
    where: { id: parentId, userId: userId },
  });

  if (!parentCategory) {
    throw new Error("Parent category not found");
  }

  if (categoryType !== parentCategory.type) {
    throw new Error("Parent category type does not match");
  }
};
