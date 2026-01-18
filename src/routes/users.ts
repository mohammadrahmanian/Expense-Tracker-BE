import { FastifyInstance } from "fastify";
import { createUser, getUser, loginUser, logoutUser } from "../controllers/users";

const createUserOpts = {
  schema: {
    response: {
      201: {
        properties: {
          token: { type: "string" },
          user: { $ref: "userSchema#" },
        },
      },
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
          user: { $ref: "userSchema#" },
        },
      },
      401: { $ref: "errorSchema#" },
      400: { $ref: "errorSchema#" },
    },
  },
  handler: loginUser,
};

const logoutUserOpts = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "userSchema#" },
        },
      },
    },
  },
  handler: logoutUser,
};

const getUserOpts = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          user: { $ref: "userSchema#" },
        },
      },
    },
  },
  handler: getUser,
};

export const usersRoutes = (fastify: FastifyInstance, options, done) => {
  fastify.post("/users/register", createUserOpts);

  fastify.post("/users/login", loginUserOpts);

  fastify.post("/users/logout", {
    ...logoutUserOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  fastify.get("/users/me", {
    ...getUserOpts,
    preHandler: fastify.auth([fastify.verifyToken]),
  });

  done();
};
