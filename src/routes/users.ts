import { FastifyInstance } from "fastify";
import { createUser, loginUser } from "../controllers/users";

const createUserOpts = {
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
  handler: createUser,
};

const loginUserOpts = {
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
  handler: loginUser,
};

export const usersRoutes = (fastify: FastifyInstance, options, done) => {
  fastify.post("/users/register", createUserOpts);

  fastify.post("/users/login", loginUserOpts);

  done();
};
