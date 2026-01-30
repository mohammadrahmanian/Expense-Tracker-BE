import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { PrismaClient, User } from "@prisma/client";

export const getUsers = async (prisma: PrismaClient) => {
  try {
    const users = await prisma.user.findMany();
    return users;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch users: ${message}`);
  }
};

export const createNewUser = async (
  prisma: PrismaClient,
  email: string,
  password: string,
) => {
  const saltRounds = 10;
  let hashedPassword: string;
  try {
    hashedPassword = await bcrypt.hash(password, saltRounds);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to hash password: ${message}`);
  }

  try {
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword },
    });

    return newUser;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create user: ${message}`);
  }
};

export const createJWTToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT secret environment variable is not set");
  }

  const token = jwt.sign(
    {
      userId: userId,
    },
    jwtSecret,
    { expiresIn: "7d" },
  );

  return token;
};

export const getUserByEmail = async (
  prisma: PrismaClient,
  email: string,
): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch user with email ${email}: ${message}`);
  }
};

export const getUserById = async (
  prisma: PrismaClient,
  userId: string,
): Promise<User | null> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch user with id ${userId}: ${message}`);
  }
};
