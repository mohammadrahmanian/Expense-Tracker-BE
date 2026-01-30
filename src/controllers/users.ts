import bcrypt from "bcrypt";

import { CookieSerializeOptions } from "@fastify/cookie";
import { User } from "@prisma/client";
import { captureException } from "@sentry/node";
import { FastifyReply, FastifyRequest } from "fastify";
import { getTokenFromRequest } from "../plugins/auth";
import { createDefaultCategories } from "../services/categories";
import {
  createJWTToken,
  createNewUser,
  getUserByEmail,
  getUserById,
} from "../services/users";

const TOKEN_COOKIE_NAME = "token";
const TOKEN_COOKIE_SETTINGS: CookieSerializeOptions = {
  httpOnly: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export const createUser = async (
  req: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply
) => {
  const { server } = req;
  const { email, password } = req.body;
  let user: User | null;
  let newUser: User;
  let token: string;

  try {
    user = await getUserByEmail(server.prisma, email);
  } catch (error) {
    captureException(error);
    return reply.code(500).send({
      error: "Internal Server Error",
      message: "An error occurred while creating the user.",
      statusCode: 500,
    });
  }

  if (user) {
    return reply.status(400).send({
      error: "User already exists",
      message: "A user with this email already exists.",
      statusCode: 400,
    });
  }

  try {
    newUser = await createNewUser(server.prisma, email, password);
  } catch (error) {
    req.log.error("Error creating user:", error);
    captureException(error);
    return reply.code(500).send({
      error: "Internal Server Error",
      message: "An error occurred while creating the user.",
      statusCode: 500,
    });
  }

  try {
    token = createJWTToken(newUser.id);
  } catch (error) {
    req.log.error("Error creating JWT token:", error);
    captureException(error);
    return reply.code(500).send({
      error: "Internal Server Error",
      message: "An error occurred while creating the user.",
      statusCode: 500,
    });
  }

  try {
    await createDefaultCategories(server.prisma, newUser.id);
  } catch {
    captureException("Error creating default categories for new user");
    // Not critical, so we don't block user creation
  }

  reply.setCookie(TOKEN_COOKIE_NAME, token, TOKEN_COOKIE_SETTINGS);

  return reply.status(201).send({
    user: {
      id: newUser.id,
      email: newUser.email,
    },
  });
};

export const loginUser = async (
  req: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply
) => {
  const { server } = req;
  const { email, password } = req.body;
  let user: User | null;
  let token: string;
  try {
    user = await getUserByEmail(server.prisma, email);
  } catch (error) {
    captureException(error);
    return reply.code(500).send({
      error: "Internal Server Error",
      message: "An error occurred while logging in.",
      statusCode: 500,
    });
  }

  if (!user) {
    return reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid email or password.",
      statusCode: 401,
    });
  }

  try {
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid email or password.",
        statusCode: 401,
      });
    }
  } catch (error) {
    captureException(error);
    return reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid email or password.",
      statusCode: 401,
    });
  }

  try {
    token = createJWTToken(user.id);
  } catch (error) {
    captureException(error);
    return reply.code(500).send({
      error: "Internal Server Error",
      message: "An error occurred while logging in.",
      statusCode: 500,
    });
  }

  if (!token) {
    return reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid email or password.",
      statusCode: 401,
    });
  }

  reply.setCookie(TOKEN_COOKIE_NAME, token, TOKEN_COOKIE_SETTINGS);

  return reply.send({
    user: {
      id: user.id,
      email: user.email,
    },
  });
};

export const getUser = async (req: FastifyRequest, reply: FastifyReply) => {
  const { server } = req;
  try {
    const user = await getUserById(server.prisma, req.user.id);

    if (!user) {
      return reply.status(404).send({
        error: "Not Found",
        message: "User not found.",
        statusCode: 404,
      });
    }

    // To support migrating to cookies while keeping existing functionality
    // TODO: Remove after FE migration to cookies
    const token = getTokenFromRequest(req);
    if (token) {
      reply.setCookie(TOKEN_COOKIE_NAME, token, TOKEN_COOKIE_SETTINGS);
    }

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "An error occurred while retrieving the user.",
      statusCode: 500,
    });
  }
};

export const logoutUser = async (_: FastifyRequest, reply: FastifyReply) => {
  reply.clearCookie(TOKEN_COOKIE_NAME, { path: "/" });
  return reply.send({ message: "Logged out successfully" });
}