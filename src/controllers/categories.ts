import { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";

import { categories } from "../mocked/categories";
import { Category } from "../types/category";

export const getCategories = (req: FastifyRequest, reply: FastifyReply) => {
  const { user } = req;
  const userCategories = categories.filter((cat) => cat.userId === user.id);
  reply.send(userCategories);
};

export const getCategoryById = (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user } = req;
  const category = categories.find(
    (cat) => cat.id === id && cat.userId === user.id
  );

  if (!category) {
    return reply.status(404).send({ error: "Category not found" });
  }

  reply.send(category);
};

type CreateCategoryBody = Omit<
  Category,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export const createCategory = (
  req: FastifyRequest<{ Body: CreateCategoryBody }>,
  reply: FastifyReply
) => {
  const { user } = req;

  // TODO: Validate and sanitize the request body
  const newCategory: Category = {
    ...req.body,
    id: uuidv4(),
    userId: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  categories.push(newCategory);
  reply.status(201).send(newCategory);
};

export const editCategory = (
  req: FastifyRequest<{ Body: Partial<Category>; Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { user } = req;
  const { id } = req.params;
  const index = categories.findIndex(
    (cat) => cat.id === id && cat.userId === user.id
  );
  if (index === -1) {
    return reply.status(404).send({ error: "Category not found" });
  }
  // TODO: Validate and sanitize the request body
  const updatedCategory: Category = {
    ...categories[index],
    ...req.body,
    updatedAt: new Date(),
  };
  categories[index] = updatedCategory;
  reply.code(204).send();
};

export const deleteCategory = (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const { id } = req.params;
  const { user } = req;
  const index = categories.findIndex(
    (cat) => cat.id === id && cat.userId === user.id
  );
  if (index === -1) {
    return reply.status(404).send({ error: "Category not found" });
  }
  categories.splice(index, 1);
  reply.code(204).send();
};
