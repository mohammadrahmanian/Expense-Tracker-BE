import crypto from "node:crypto";

import { McpOAuthClient, PrismaClient } from "@prisma/client";

import {
  AUTH_CODE_TTL_MS,
  AUTH_REQUEST_TTL_MS,
  REFRESH_TOKEN_TTL_SEC,
} from "./config";

// In-memory state for the short-lived OAuth artifacts. Consistent with the
// existing in-memory MCP session tradeoff (single pm2 instance); a restart
// only drops in-flight authorizations, which clients simply retry.

export type PendingAuthRequest = {
  clientId: string;
  clientName: string | null;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  scope?: string;
  createdAt: number;
};

export type AuthCode = {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
  createdAt: number;
};

const pendingRequests = new Map<string, PendingAuthRequest>();
const authCodes = new Map<string, AuthCode>();

setInterval(() => {
  const now = Date.now();
  for (const [id, req] of pendingRequests) {
    if (now - req.createdAt >= AUTH_REQUEST_TTL_MS) pendingRequests.delete(id);
  }
  for (const [code, entry] of authCodes) {
    if (now - entry.createdAt >= AUTH_CODE_TTL_MS) authCodes.delete(code);
  }
}, 60_000).unref();

const randomToken = (): string => crypto.randomBytes(32).toString("base64url");
const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

export const createPendingRequest = (
  req: Omit<PendingAuthRequest, "createdAt">,
): string => {
  const id = randomToken();
  pendingRequests.set(id, { ...req, createdAt: Date.now() });
  return id;
};

export const getPendingRequest = (id: string): PendingAuthRequest | null => {
  const req = pendingRequests.get(id);
  if (!req) return null;
  if (Date.now() - req.createdAt >= AUTH_REQUEST_TTL_MS) {
    pendingRequests.delete(id);
    return null;
  }
  return req;
};

export const consumePendingRequest = (
  id: string,
): PendingAuthRequest | null => {
  const req = getPendingRequest(id);
  if (req) pendingRequests.delete(id);
  return req;
};

export const createAuthCode = (data: Omit<AuthCode, "createdAt">): string => {
  const code = randomToken();
  authCodes.set(code, { ...data, createdAt: Date.now() });
  return code;
};

// Single-use: always removes the code, returns null if expired/unknown.
export const consumeAuthCode = (code: string): AuthCode | null => {
  const entry = authCodes.get(code);
  if (!entry) return null;
  authCodes.delete(code);
  if (Date.now() - entry.createdAt >= AUTH_CODE_TTL_MS) return null;
  return entry;
};

// PKCE S256: base64url(sha256(verifier)) must equal the stored challenge.
export const verifyPkce = (verifier: string, challenge: string): boolean => {
  const computed = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ---- Persisted: OAuth clients (RFC 7591 dynamic registration) ----

export const registerClient = async (
  prisma: PrismaClient,
  data: { clientName: string | null; redirectUris: string[] },
): Promise<string> => {
  const clientId = randomToken();
  await prisma.mcpOAuthClient.create({
    data: { clientId, clientName: data.clientName, redirectUris: data.redirectUris },
  });
  return clientId;
};

export const getClient = (
  prisma: PrismaClient,
  clientId: string,
): Promise<McpOAuthClient | null> =>
  prisma.mcpOAuthClient.findUnique({ where: { clientId } });

// ---- Persisted: refresh tokens (revocable, rotated on use) ----

export const issueRefreshToken = async (
  prisma: PrismaClient,
  data: { userId: string; clientId: string; scope?: string | null },
): Promise<string> => {
  const token = randomToken();
  await prisma.mcpRefreshToken.create({
    data: {
      tokenHash: sha256(token),
      userId: data.userId,
      clientId: data.clientId,
      scope: data.scope ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000),
    },
  });
  return token;
};

// Atomically rotate a refresh token: revoke the presented one and mint its
// replacement in a single transaction. The conditional updateMany is the race
// gate — it revokes only the still-active row (matching client, not revoked,
// not expired), and Postgres row locking guarantees exactly one concurrent
// caller sees count === 1. Losers get count 0 and null, so a replayed/rotated
// token can never mint a second set of tokens (no refresh-token-reuse TOCTOU).
export const rotateRefreshToken = async (
  prisma: PrismaClient,
  presentedToken: string,
  clientId: string,
): Promise<{ userId: string; scope: string | null; newToken: string } | null> =>
  prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.mcpRefreshToken.updateMany({
      where: {
        tokenHash: sha256(presentedToken),
        clientId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });
    if (claimed.count !== 1) return null;

    const row = await tx.mcpRefreshToken.findUnique({
      where: { tokenHash: sha256(presentedToken) },
    });
    if (!row) return null; // defensive: we just revoked it, so it must exist

    const newToken = randomToken();
    await tx.mcpRefreshToken.create({
      data: {
        tokenHash: sha256(newToken),
        userId: row.userId,
        clientId: row.clientId,
        scope: row.scope,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000),
      },
    });
    return { userId: row.userId, scope: row.scope, newToken };
  });
