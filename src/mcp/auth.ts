import { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

// Namespaced custom claim injected by an Auth0 post-login Action.
// See doc/private/server-env-and-reload.md and the implementation plan.
const EMAIL_CLAIM_NAMESPACE = "https://expensio/email";
const CACHE_TTL_MS = 10 * 60 * 1000;

// Cache the resolved email per session, but bind it to the exact bearer token
// it was derived from. A session can be reused with a different token (account
// switch); keying on sessionId alone would hand back a stale email.
type EmailCacheEntry = { email: string; token: string; cachedAt: number };
const emailCache = new Map<string, EmailCacheEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of emailCache) {
    if (now - entry.cachedAt >= CACHE_TTL_MS) emailCache.delete(key);
  }
}, CACHE_TTL_MS).unref();

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

function emailFromToken(token: string): string | null {
  // The token is already verified by @platformatic/mcp's authorization layer
  // (JWKS + audience). We only need to decode for the email claim here.
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object") return null;
  const claims = decoded as Record<string, unknown>;
  const value = claims[EMAIL_CLAIM_NAMESPACE] ?? claims["email"];
  return typeof value === "string" ? value.toLowerCase() : null;
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
  sessionId: string | undefined
): Promise<ResolveUserResult> {
  const token = extractBearerToken(request);
  let email: string | null = null;

  if (sessionId && token) {
    const cached = emailCache.get(sessionId);
    if (cached) {
      // Only trust the cache when it was derived from this exact token and is
      // still fresh; otherwise drop it (stale or token/account switch).
      if (cached.token === token && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        email = cached.email;
      } else {
        emailCache.delete(sessionId);
      }
    }
  }

  if (!email) {
    email = token ? emailFromToken(token) : null;
    if (email && sessionId && token) {
      emailCache.set(sessionId, { email, token, cachedAt: Date.now() });
    }
  }

  if (!email) {
    return {
      error: toolError(
        "Token missing email claim. Reconnect with scope 'openid email' and ensure the Auth0 post-login Action is installed."
      ),
    };
  }

  const user = await fastify.prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    return {
      error: toolError(
        "No expensio account linked to this email. Sign up first via the app, then reconnect the agent."
      ),
    };
  }

  return { user };
}
