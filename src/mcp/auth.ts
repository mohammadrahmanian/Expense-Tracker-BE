import { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

// Namespaced custom claim injected by an Auth0 post-login Action.
// See doc/private/server-env-and-reload.md and the implementation plan.
const EMAIL_CLAIM_NAMESPACE = "https://expensio/email";
const CACHE_TTL_MS = 10 * 60 * 1000;

type EmailCacheEntry = { email: string; cachedAt: number };
const emailCache = new Map<string, EmailCacheEntry>();

export type ToolErrorResult = {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
};

const toolError = (text: string): ToolErrorResult => ({
  isError: true,
  content: [{ type: "text", text }],
});

export type AuthorizationContext = {
  userId?: string;
  scopes?: string[];
  clientId?: string;
  audience?: string[] | string;
};

export function requireScope(
  authContext: AuthorizationContext | undefined,
  scope: string
): ToolErrorResult | null {
  const scopes = authContext?.scopes ?? [];
  return scopes.includes(scope)
    ? null
    : toolError(`Missing required scope: ${scope}`);
}

function extractEmailFromRequest(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (typeof auth !== "string" || !auth.startsWith("Bearer ")) return null;
  // The token is already verified by @platformatic/mcp's authorization layer
  // (JWKS + audience). We only need to decode for the email claim here.
  const decoded = jwt.decode(auth.slice("Bearer ".length));
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
  let email: string | null = null;

  if (sessionId) {
    const cached = emailCache.get(sessionId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      email = cached.email;
    }
  }

  if (!email) {
    email = extractEmailFromRequest(request);
    if (email && sessionId) {
      emailCache.set(sessionId, { email, cachedAt: Date.now() });
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
