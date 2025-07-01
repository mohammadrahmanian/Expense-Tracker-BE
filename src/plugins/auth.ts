import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface JWTPayload extends JwtPayload {
  userId: string;
}

export const verifyTokenPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const verifyToken = async (
    req: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void
  ) => {
    const authHeader = req.headers.authorization;

    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;
    if (!token) {
      return done(new Error("No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
      if (!decoded.userId) {
        return done(new Error("Invalid token structure"));
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) return done(new Error("User not found"));

      req.user = {
        id: user.id,
      };

      done();
    } catch (error) {
      return done(
        error instanceof Error ? error : new Error("Invalid token structure")
      );
    }
  };

  fastify.decorate("verifyToken", verifyToken);
});
