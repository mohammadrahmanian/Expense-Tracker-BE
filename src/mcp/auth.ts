import { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

export type ToolErrorResult = {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
};

const toolError = (text: string): ToolErrorResult => ({
  isError: true,
  content: [{ type: "text", text }],
});

function extractBearerToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (typeof auth !== "string") return null;
  const parts = auth.split(" ");
  if (parts.length < 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

// Access tokens are now issued by our own OAuth server (src/mcp/oauth) and carry
// the user id in the standard `sub` claim. The signature + audience are already
// verified upstream by @platformatic/mcp against our JWKS, so we only decode.
function userIdFromToken(token: string): string | null {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object") return null;
  const sub = (decoded as Record<string, unknown>).sub;
  return typeof sub === "string" ? sub : null;
}

export type ResolvedUser = { id: string; email: string };

// Property-based discriminant ("error" in r) narrows reliably across TS
// versions — preferred over a shared boolean tag here.
export type ResolveUserResult =
  | { user: ResolvedUser }
  | { error: ToolErrorResult };

export async function resolveMcpUser(
  fastify: FastifyInstance,
  request: FastifyRequest,
  _sessionId: string | undefined,
): Promise<ResolveUserResult> {
  const token = extractBearerToken(request);
  const userId = token ? userIdFromToken(token) : null;

  if (!userId) {
    return {
      error: toolError("Invalid token: missing subject. Reconnect the agent."),
    };
  }

  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return {
      error: toolError(
        "No expensio account is linked to this token. Reconnect the agent.",
      ),
    };
  }

  return { user };
}
