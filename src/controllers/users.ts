import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { users } from "../mocked/users";
import { jwtSecretKey } from "../plugins/jwtSecretKey";

const saltRounds = 10;

export const createUser = async (req, reply) => {
  const { email, password } = req.body;
  const isUserAlreadyExists =
    users.findIndex((user) => user.email === email) !== -1;

  if (isUserAlreadyExists) {
    return reply.status(400).send({
      error: "User already exists",
      message: "A user with this email already exists.",
      statusCode: 400,
    });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    return reply.status(201).send(newUser);
  } catch (error) {
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "An error occurred while creating the user.",
      statusCode: 500,
    });
  }
};

export const loginUser = async (req, reply) => {
  const { email, password } = req.body;
  // TODO: Read users from the database instead of mocked data
  const user = users.find((user) => user.email === email);
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
    jwtSecretKey,
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
