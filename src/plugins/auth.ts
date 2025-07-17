import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface JWTPayload extends JwtPayload {
  userId: string;
}

export const verifyTokenPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const verifyToken = async (req: FastifyRequest, _: FastifyReply) => {
    const authHeader = req.headers.authorization;

    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;
    if (!token) {
      throw new Error("No token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    if (!decoded.userId) {
      throw new Error("Invalid token structure");
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) throw new Error("User not found");

    req.user = {
      id: user.id,
    };
  };

  fastify.decorate("verifyToken", verifyToken);
});
