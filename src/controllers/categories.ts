import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Category } from "@prisma/client";
import { CATEGORY_CONFIG } from '../config/constants.js';
import { flattenCategoryTree, sanitizeCategoryForJSON } from '../utils/categoryTree.js';

const getCategoryInclude = (depth: number = CATEGORY_CONFIG.MAX_QUERY_DEPTH) => {
  if (depth <= 0) return {};
  
  return {
    children: {
      take: 20, // Limit number of children per level
      include: depth > 1 ? getCategoryInclude(depth - 1) : {}
    }
  };
};

async function validateCategoryDepth({
  parentId,
  userId,
  server
}: {
  parentId: string;
  userId: string;
  server: FastifyInstance;
}): Promise<void> {
  let depth = 1;
  let currentParentId = parentId;
  
  while (currentParentId && depth < CATEGORY_CONFIG.MAX_NESTING_DEPTH) {
    const parent = await server.prisma.category.findUnique({
      where: { id: currentParentId, userId },
      select: { parentId: true }
    });
    
    if (!parent) break;
    currentParentId = parent.parentId;
    depth++;
  }
  
  if (depth >= CATEGORY_CONFIG.MAX_NESTING_DEPTH) {
    throw new Error(`Maximum category nesting depth (${CATEGORY_CONFIG.MAX_NESTING_DEPTH}) exceeded`);
  }
}

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
  if (categoryId && (parentId === categoryId)) {
    throw new Error("Category cannot be its own parent");
  }

  // Check for cycles by walking up the parent chain
  if (categoryId) {
    const visited = new Set<string>([categoryId]);
    let currentParentId = parentId;
    
    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new Error("Circular reference detected in category hierarchy");
      }
      
      visited.add(currentParentId);
      const ancestor = await server.prisma.category.findUnique({
        where: { id: currentParentId, userId },
        select: { parentId: true }
      });
      
      if (!ancestor) break;
      currentParentId = ancestor.parentId;
    }
  }
};

export const getCategories = async (
  req: FastifyRequest<{ 
    Querystring: { 
      flat?: 'true' | 'false';
      depth?: string;
    } 
  }>, 
  reply: FastifyReply
) => {
  try {
    const { user, server } = req;
    const flat = req.query.flat === 'true';
    const maxDepth = req.query.depth ? parseInt(req.query.depth, 10) : CATEGORY_CONFIG.MAX_QUERY_DEPTH;
    const queryDepth = Math.min(maxDepth, CATEGORY_CONFIG.MAX_QUERY_DEPTH);
    
    const userCategories = await server.prisma.category.findMany({
      where: { userId: user.id },
      include: getCategoryInclude(queryDepth),
      orderBy: { createdAt: 'desc' }
    });
    
    if (flat) {
      const flatCategories = flattenCategoryTree(userCategories, maxDepth);
      return reply.send(flatCategories);
    } else {
      const sanitizedCategories = userCategories.map(cat => sanitizeCategoryForJSON(cat, maxDepth));
      return reply.send(sanitizedCategories);
    }
  } catch (error) {
    req.log?.error(error) || console.error("Error fetching categories:", error);
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
};

export const getCategoryById = async (
  req: FastifyRequest<{ 
    Params: { id: string };
    Querystring: { 
      depth?: string;
    } 
  }>,
  reply: FastifyReply
) => {
  try {
    const { id } = req.params;
    const { user, server } = req;
    const maxDepth = req.query.depth ? parseInt(req.query.depth, 10) : CATEGORY_CONFIG.MAX_QUERY_DEPTH;
    const queryDepth = Math.min(maxDepth, CATEGORY_CONFIG.MAX_QUERY_DEPTH);
    
    const category = await server.prisma.category.findUnique({
      where: { userId: user.id, id: id },
      include: getCategoryInclude(queryDepth)
    });

    if (!category) {
      return reply.status(404).send({ error: "Category not found" });
    }

    const sanitizedCategory = sanitizeCategoryForJSON(category, maxDepth);
    return reply.send(sanitizedCategory);
  } catch (error) {
    req.log?.error(error) || console.error("Error fetching category:", error);
    return reply.status(500).send({ error: 'Internal Server Error' });
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
      
      await validateCategoryDepth({
        parentId: parentId,
        userId: user.id,
        server: server
      });
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
      include: getCategoryInclude(2)
    });

    if (!category) {
      return reply.status(400).send({ error: "Failed to create category" });
    }

    return reply.status(201).send(category);
  } catch (error) {
    req.log?.error(error) || console.error("Error creating category:", error);
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
        select: { type: true }
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
      
      await validateCategoryDepth({
        parentId: parentId,
        userId: user.id,
        server: server
      });
    }

    const editedCategory = await server.prisma.category.update({
      where: { id: id, userId: user.id },
      data: {
        ...allowedFields,
        ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
      },
      include: getCategoryInclude(2)
    });

    if (!editedCategory) {
      return reply.status(404).send({ error: "Category not found" });
    }

    return reply.send(editedCategory);
  } catch (error) {
    req.log?.error(error) || console.error("Error editing category:", error);
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
    req.log?.error(error) || console.error("Error deleting category:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
};
