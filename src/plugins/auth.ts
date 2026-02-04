import { captureException } from "@sentry/node";
import { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface JWTPayload extends JwtPayload {
  userId: string;
}

const errorMessage = "Authentication failed";

export const verifyTokenPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const verifyToken = async (req: FastifyRequest) => {
    const token = getTokenFromRequest(req);

    if (!token) {
      captureException(new Error("No token provided"), { level: "info" });
      throw new Error(errorMessage);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      captureException(new Error("JWT secret not set"), { level: "fatal" });
      throw new Error(errorMessage);
    }
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    if (!decoded.userId) {
      captureException(new Error("Invalid token structure"), { level: "info" });
      throw new Error(errorMessage);
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      captureException(new Error("User not found"), { level: "info" });
      throw new Error(errorMessage);
    }

    req.user = {
      id: user.id,
    };
  };

  fastify.decorate("verifyToken", verifyToken);
});

export function getTokenFromRequest(req: FastifyRequest): string | undefined {
  let token: string | undefined;

  token = getTokenFromCookies(req);

  // Fallback to Authorization header if no cookie is found
  // Remove after FE migration to cookies
  if (!token) {
    token = getTokenFromAuthHeader(req);
  }
  return token;
}

function getTokenFromCookies(req: FastifyRequest): string | undefined {
  if (!req.cookies) return undefined;
  return req.cookies.token;
}

/* 
  Temporary: helper function to read token from Authorization header
  @deprecated Remove after FE migration to cookies
*/
function getTokenFromAuthHeader(req: FastifyRequest): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader) return undefined;
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
}
