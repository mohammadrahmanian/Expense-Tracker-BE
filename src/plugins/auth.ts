import { FastifyReply, FastifyRequest } from "fastify";
import jwt, { JwtPayload } from "jsonwebtoken";
import { jwtSecretKey } from "./jwtSecretKey";
import { users } from "../mocked/users";

export interface JWTPayload extends JwtPayload {
  userId: string;
}

export const verifyToken = (
  req: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
) => {
  const authHeader = req.headers.authorization;

  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

  jwt.verify(token, jwtSecretKey, (error, decoded: JWTPayload) => {
    if (error) done(new Error("Invalid token structure"));
    if (decoded.userId) {
      const user = users.find((user) => user.id === decoded.userId);
      if (!user) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "User not found",
          statusCode: 401,
        });
      }

      req.user = {
        id: user.id,
      };

      done();
    } else {
      done(new Error("Invalid token structure"));
    }
  });
};
