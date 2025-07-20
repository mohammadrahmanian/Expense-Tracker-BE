import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { Category } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";

const saltRounds = 10;

const categoriesToCreateForNewUser: Pick<
  Category,
  "name" | "type" | "color"
>[] = [
  { name: "Food", type: "EXPENSE", color: "#FF6347" },
  { name: "Transportation", type: "EXPENSE", color: "#4682B4" },
  { name: "Utilities", type: "EXPENSE", color: "#32CD32" },
  { name: "Entertainment", type: "EXPENSE", color: "#FFD700" },
  { name: "Health", type: "EXPENSE", color: "#FF4500" },
  { name: "Household", type: "EXPENSE", color: "#8B4513" },
  { name: "Other Expenses", type: "EXPENSE", color: "#A9A9A9" },
  { name: "Salary", type: "INCOME", color: "#8A2BE2" },
  { name: "Bonus", type: "INCOME", color: "#00CED1" },
  { name: "Refund", type: "INCOME", color: "#FF69B4" },
  { name: "Other Income", type: "INCOME", color: "#20B2AA" },
];

export const createUser = async (
  req: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply
) => {
  const { server } = req;
  const { email, password } = req.body;
  // TODO: Validate and sanitize input
  const user = await server.prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    return reply.status(400).send({
      error: "User already exists",
      message: "A user with this email already exists.",
      statusCode: 400,
    });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await server.prisma.user
      .create({
        data: { email, password: hashedPassword },
      })
      .catch((error) => {
        req.log.error("Error creating user:", error);
        throw new Error("Failed to create user");
      });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT secret environment variable is not set");
    }

    const token = jwt.sign(
      {
        userId: newUser.id,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );

    await server.prisma.category
      .createMany({
        data: categoriesToCreateForNewUser.map((category) => ({
          ...category,
          userId: newUser.id,
        })),
      })
      .catch((error) => {
        req.log.error("Error creating default categories:", error);
        // Not throwing an error here to allow user creation even if category creation fails
      });

    return reply.status(201).send({
      user: {
        id: newUser.id,
        email: newUser.email,
      },
      token,
    });
  } catch (error) {
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "An error occurred while creating the user.",
      statusCode: 500,
    });
  }
};

export const loginUser = async (
  req: FastifyRequest<{ Body: { email: string; password: string } }>,
  reply: FastifyReply
) => {
  const { server } = req;
  const { email, password } = req.body;
  // TODO: Validate and sanitize input
  const user = await server.prisma.user.findUnique({ where: { email } });
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
    return reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid email or password.",
      statusCode: 401,
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT secret environment variable is not set");
  }

  const token = jwt.sign(
    {
      userId: user.id,
    },
    jwtSecret,
    { expiresIn: "7d" }
  );

  if (!token) {
    return reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid email or password.",
      statusCode: 401,
    });
  }

  return reply.send({
    token,
    user: {
      id: user.id,
      email: user.email,
    },
  });
};

export const getUser = async (req: FastifyRequest, reply: FastifyReply) => {
  const { server, user } = req;
  try {
    const queriedUser = await server.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!queriedUser) {
      return reply.status(404).send({
        error: "Not Found",
        message: "User not found.",
        statusCode: 404,
      });
    }

    return reply.send({
      user: {
        id: queriedUser.id,
        email: queriedUser.email,
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
