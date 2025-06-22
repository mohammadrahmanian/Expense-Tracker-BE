import { FastifyInstance } from "fastify";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  editCategory,
} from "../controllers/categories";

const getCategoriesOpts = {
  schema: {
    response: {
      200: {
        type: "array",
        items: { $ref: "categorySchema#" },
      },
    },
  },
  handler: getCategories,
};

const getCategoryOpts = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { $ref: "categorySchema#/properties/id" },
      },
    },
    response: {
      200: { $ref: "categorySchema#" },
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
    },
  },
  handler: getCategoryById,
};

const createCategoryOpts = {
  schema: {
    body: {
      type: "object",
      required: ["name", "type"],
      properties: {
        name: { $ref: "categorySchema#/properties/name" },
        type: { $ref: "categorySchema#/properties/type" },
        description: { $ref: "categorySchema#/properties/description" },
        parentId: { $ref: "categorySchema#/properties/parentId" },
      },
    },
    response: {
      201: { $ref: "categorySchema#" },
      400: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
      401: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
    },
  },
  handler: createCategory,
};

const deleteCategoryOpts = {
  schema: {
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { $ref: "categorySchema#/properties/id" },
      },
    },
    response: {
      204: {
        type: "null",
      },
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
    },
  },
  handler: deleteCategory,
};

const editCategoryOpts = {
  schema: {
    body: {
      type: "object",
      properties: {
        name: { $ref: "categorySchema#/properties/name" },
        type: { $ref: "categorySchema#/properties/type" },
        description: { $ref: "categorySchema#/properties/description" },
        parentId: { $ref: "categorySchema#/properties/parentId" },
      },
    },
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { $ref: "categorySchema#/properties/id" },
      },
    },
    response: {
      204: {
        type: "null",
      },
      404: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
      },
    },
  },
  handler: editCategory,
};

export const categoriesRoutes = (fastify: FastifyInstance, options, done) => {
  fastify.get("/categories", {
    ...getCategoriesOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.get("/categories/:id", {
    ...getCategoryOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.post("/categories", {
    ...createCategoryOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.delete("/categories/:id", {
    ...deleteCategoryOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.put("/categories/:id", {
    ...editCategoryOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  done();
};
