import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createUser, loginUser } from "../controllers/users";

const createUserOpts = (fastify: FastifyInstance) => ({
  schema: {
    response: {
      200: { $ref: "userSchema#" },
    },
    body: {
      type: "object",
      required: ["password", "email"],

      properties: {
        password: { $ref: "userSchema#/properties/password" },
        email: { $ref: "userSchema#/properties/email" },
      },
    },
  },
  handler: (
    req: FastifyRequest<{ Body: { email: string; password: string } }>,
    reply: FastifyReply
  ) => createUser(req, reply, fastify),
});

const loginUserOpts = (fastify: FastifyInstance) => ({
  schema: {
    body: {
      type: "object",
      properties: {
        email: { $ref: "userSchema#/properties/email" },
        password: { $ref: "userSchema#/properties/password" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          token: { type: "string" },
        },
      },
      401: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          statusCode: { type: "number" },
        },
        400: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            statusCode: { type: "number" },
          },
        },
      },
    },
  },
  handler: (
    req: FastifyRequest<{ Body: { email: string; password: string } }>,
    reply: FastifyReply
  ) => loginUser(req, reply, fastify),
});

export const usersRoutes = (fastify: FastifyInstance, options, done) => {
  fastify.post("/users/register", createUserOpts(fastify));

  fastify.post("/users/login", loginUserOpts(fastify));

  done();
};
