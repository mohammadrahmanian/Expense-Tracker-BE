import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { FastifyReply, FastifyRequest } from "fastify";

const saltRounds = 10;

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

    const user = await server.prisma.user.create({
      data: { email, password: hashedPassword },
    });

    return reply.status(201).send(user);
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

  const token = jwt.sign(
    {
      userId: user.id,
    },
    process.env.JWT_SECRET,
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
  });
};
