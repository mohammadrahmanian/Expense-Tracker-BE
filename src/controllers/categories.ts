import { Category } from "@prisma/client";
import { captureException } from "@sentry/node";
import { FastifyReply, FastifyRequest } from "fastify";
import { CATEGORY_CONFIG } from "../config/constants.js";
import {
  createCategory as createCategoryService,
  editCategory as editCategoryService,
  getCategory,
  getCategoryInclude,
} from "../services/categories.js";

export const getCategories = async (
  req: FastifyRequest<{
    Querystring: {
      depth?: string;
    };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { user, server } = req;

    const depth = req.query.depth
      ? parseInt(req.query.depth, 10)
      : CATEGORY_CONFIG.MAX_QUERY_DEPTH;
    if (!user) throw new Error("User not authenticated");

    const queryDepth = Math.min(depth, CATEGORY_CONFIG.MAX_QUERY_DEPTH);
    const userCategories = await server.prisma.category.findMany({
      where: { userId: user.id },
      include: getCategoryInclude(queryDepth),
      orderBy: { createdAt: "desc" },
    });
    return reply.send(userCategories);
  } catch (error) {
    req.log.error(error);
    captureException(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const getCategoryById = async (
  req: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply,
) => {
  try {
    const { id } = req.params;
    const { user, server } = req;
    if (!user) throw new Error("User not authenticated");

    const category = await getCategory({
      categoryId: id,
      userId: user.id,
      prisma: server.prisma,
      withChildren: true,
    });

    if (!category) {
      return reply.status(404).send({ error: "Category not found" });
    }

    return reply.send(category);
  } catch (error) {
    req.log.error(error);
    captureException(error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
};

export const createCategory = async (
  req: FastifyRequest<{ Body: Category }>,
  reply: FastifyReply,
) => {
  try {
    const { user, server } = req;

    if (!user) throw new Error("User not authenticated");

    // Extract only the allowed fields from the request body
    const {
      name,
      type,
      description,
      color,
      icon,
      budgetAmount,
      budgetPeriod,
      parentId,
    } = req.body;

    // Create allowedFields object with only valid Category fields
    const allowedFields = {
      name,
      type,
      description,
      color,
      icon,
      budgetAmount,
      budgetPeriod,
    };

    const category = await createCategoryService({
      prisma: server.prisma,
      userId: user.id,
      parentId,
      allowedFields,
    });

    if (!category) {
      throw new Error("Failed to create category");
    }

    return reply.status(201).send(category);
  } catch (error) {
    req.log.error(error);

    if (error instanceof Error && error.cause === "VALIDATION_ERROR") {
      return reply.status(400).send({ error: error.message });
    } else {
      captureException(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
};

type EditCategoryBody = Partial<Category>;

export const editCategory = async (
  req: FastifyRequest<{ Body: EditCategoryBody; Params: { id: string } }>,
  reply: FastifyReply,
) => {
  try {
    const { user, server } = req;
    if (!user) throw new Error("User not authenticated");
    const { id } = req.params;

    // Extract only the allowed fields from the request body
    const {
      name,
      type,
      description,
      color,
      icon,
      parentId,
      budgetAmount,
      budgetPeriod,
    } = req.body;

    // Create allowedFields object with only valid Category fields (excluding undefined values)
    const allowedFields = Object.fromEntries(
      Object.entries({
        name,
        type,
        description,
        color,
        icon,
        budgetAmount,
        budgetPeriod,
      }).filter(([, value]) => value !== undefined),
    );

    const editedCategory = await editCategoryService({
      categoryId: id,
      prisma: server.prisma,
      userId: user.id,
      parentId,
      allowedFields,
    });

    if (!editedCategory) {
      throw new Error("Failed to edit category");
    }

    return reply.send(editedCategory);
  } catch (error) {
    req.log.error(error);
    if (error instanceof Error && error.cause === "VALIDATION_ERROR") {
      return reply.status(400).send({ error: error.message });
    } else {
      captureException(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  }
};

export const deleteCategory = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) => {
  const { id } = req.params;
  const { user, server } = req;
  if (!user) throw new Error("User not authenticated");
  try {
    const category = await server.prisma.category.delete({
      where: { id: id, userId: user.id },
    });

    return reply.code(204).send();
  } catch (error) {
    req.log.error(error);
    captureException(error);
    return reply.status(500).send({ error: "Internal server error" });
  }
};
