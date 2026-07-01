import { FastifyPluginAsync, FastifyRequest } from "fastify";

import {
  ACCESS_TOKEN_TTL_SEC,
  CONSENT_PATH,
  getOAuthConfig,
} from "./config";
import { getJwks, signAccessToken } from "./keys";
import {
  consumeAuthCode,
  consumePendingRequest,
  createAuthCode,
  createPendingRequest,
  getClient,
  getPendingRequest,
  issueRefreshToken,
  registerClient,
  rotateRefreshToken,
  verifyPkce,
} from "./store";

// Self-hosted OAuth 2.1 authorization server backing the MCP resource server.
// Replaces Auth0: tokens are issued against the app's own User table and login.
//
// Endpoints (all at the backend root, so the .well-known paths resolve at the
// origin the RFC 9728 protected-resource metadata advertises):
//   GET  /.well-known/oauth-authorization-server  (RFC 8414 discovery)
//   GET  /.well-known/jwks.json                   (access-token signing keys)
//   POST /oauth/register                          (RFC 7591 dynamic registration)
//   GET  /oauth/authorize                         (validate + redirect to FE consent)
//   GET  /oauth/authorize/info                    (FE fetches client/scope to display)
//   POST /oauth/authorize/decision                (FE posts approve/deny; mints code)
//   POST /oauth/token                             (code+PKCE / refresh -> access token)
//
// The browser-facing login + consent UI lives in the frontend SPA; this backend
// renders no HTML, only validates, redirects, and serves JSON.

const appendParams = (
  base: string,
  params: Record<string, string | undefined>,
): string => {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
};

const isAllowedRedirectUri = (uri: string): boolean => {
  try {
    const url = new URL(uri);
    if (url.protocol === "https:") return true;
    // Permit http only for loopback (native/CLI clients during dev).
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
};

type AuthorizeQuery = {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  scope?: string;
  state?: string;
  resource?: string;
};

type RegisterBody = {
  client_name?: string;
  redirect_uris?: unknown;
};

type TokenBody = Record<string, string | undefined>;

export const oauthModule: FastifyPluginAsync = async (fastify) => {
  if (process.env.MCP_ENABLED === "false") return;

  const { issuer, resourceUri, frontendOrigin } = getOAuthConfig();

  // OAuth token requests are form-encoded; register a parser scoped to this
  // plugin so /oauth/token can read them (JSON requests use the default parser).
  fastify.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        done(null, Object.fromEntries(new URLSearchParams(body as string)));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // --- Discovery (RFC 8414) ---
  fastify.get("/.well-known/oauth-authorization-server", async () => ({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  }));

  fastify.get("/.well-known/jwks.json", async () => getJwks());

  // --- Dynamic client registration (RFC 7591) ---
  fastify.post(
    "/oauth/register",
    async (req: FastifyRequest<{ Body: RegisterBody }>, reply) => {
      const body = req.body ?? {};
      const redirectUris = Array.isArray(body.redirect_uris)
        ? (body.redirect_uris as unknown[]).filter(
            (u): u is string => typeof u === "string",
          )
        : [];

      if (redirectUris.length === 0 || !redirectUris.every(isAllowedRedirectUri)) {
        return reply.code(400).send({
          error: "invalid_redirect_uri",
          error_description:
            "redirect_uris must be a non-empty array of https (or loopback http) URLs",
        });
      }

      const clientName =
        typeof body.client_name === "string" ? body.client_name : null;
      const clientId = await registerClient(req.server.prisma, {
        clientName,
        redirectUris,
      });

      return reply.code(201).send({
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: clientName ?? undefined,
        redirect_uris: redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      });
    },
  );

  // --- Authorization endpoint: validate, stash request, redirect to FE consent ---
  fastify.get(
    "/oauth/authorize",
    async (req: FastifyRequest<{ Querystring: AuthorizeQuery }>, reply) => {
      const q = req.query;
      const client = q.client_id
        ? await getClient(req.server.prisma, q.client_id)
        : null;

      // Without a valid client + matching redirect_uri we cannot safely
      // redirect errors back, so fail with a plain 400.
      if (!client) {
        return reply
          .code(400)
          .send({ error: "invalid_client", error_description: "Unknown client_id" });
      }
      if (!q.redirect_uri || !client.redirectUris.includes(q.redirect_uri)) {
        return reply.code(400).send({
          error: "invalid_redirect_uri",
          error_description: "redirect_uri does not match a registered URI",
        });
      }

      // From here, surface errors via redirect (state echoed) per OAuth.
      const redirectError = (error: string, description: string) =>
        reply.redirect(
          appendParams(q.redirect_uri as string, {
            error,
            error_description: description,
            state: q.state,
          }),
        );

      if (q.response_type !== "code") {
        return redirectError("unsupported_response_type", "response_type must be 'code'");
      }
      if (!q.code_challenge || q.code_challenge_method !== "S256") {
        return redirectError(
          "invalid_request",
          "PKCE with code_challenge_method=S256 is required",
        );
      }

      const requestId = createPendingRequest({
        clientId: client.clientId,
        clientName: client.clientName,
        redirectUri: q.redirect_uri,
        codeChallenge: q.code_challenge,
        state: q.state,
        scope: q.scope,
      });

      return reply.redirect(
        appendParams(`${frontendOrigin}${CONSENT_PATH}`, { request_id: requestId }),
      );
    },
  );

  // --- FE fetches details to render the consent screen ---
  fastify.get(
    "/oauth/authorize/info",
    async (
      req: FastifyRequest<{ Querystring: { request_id?: string } }>,
      reply,
    ) => {
      const pending = req.query.request_id
        ? getPendingRequest(req.query.request_id)
        : null;
      if (!pending) {
        return reply.code(404).send({ error: "request_not_found" });
      }
      return { clientName: pending.clientName, scope: pending.scope ?? null };
    },
  );

  // --- FE submits the user's approve/deny decision (cookie-authenticated) ---
  fastify.post(
    "/oauth/authorize/decision",
    {
      preHandler: fastify.auth([fastify.verifyToken]),
    },
    async (
      req: FastifyRequest<{ Body: { request_id?: string; approve?: boolean } }>,
      reply,
    ) => {
      // Defense in depth on a cookie-authed, state-changing POST.
      if (req.headers.origin !== frontendOrigin) {
        return reply.code(403).send({ error: "forbidden_origin" });
      }

      const { request_id: requestId, approve } = req.body ?? {};
      const pending = requestId ? consumePendingRequest(requestId) : null;
      if (!pending) {
        return reply.code(400).send({ error: "request_expired" });
      }

      if (!approve) {
        return reply.send({
          redirect_to: appendParams(pending.redirectUri, {
            error: "access_denied",
            state: pending.state,
          }),
        });
      }

      const code = createAuthCode({
        clientId: pending.clientId,
        userId: req.user.id,
        redirectUri: pending.redirectUri,
        codeChallenge: pending.codeChallenge,
        scope: pending.scope,
      });

      return reply.send({
        redirect_to: appendParams(pending.redirectUri, {
          code,
          state: pending.state,
        }),
      });
    },
  );

  // --- Token endpoint ---
  fastify.post(
    "/oauth/token",
    async (req: FastifyRequest<{ Body: TokenBody }>, reply) => {
      const body = req.body ?? {};
      const grantType = body.grant_type;

      const tokenError = (error: string, description?: string) =>
        reply.code(400).send({ error, error_description: description });

      if (grantType === "authorization_code") {
        const { code, redirect_uri: redirectUri, client_id: clientId } = body;
        const verifier = body.code_verifier;
        if (!code || !redirectUri || !clientId || !verifier) {
          return tokenError("invalid_request", "Missing required parameters");
        }

        const authCode = consumeAuthCode(code);
        if (
          !authCode ||
          authCode.clientId !== clientId ||
          authCode.redirectUri !== redirectUri
        ) {
          return tokenError("invalid_grant", "Authorization code is invalid or expired");
        }
        if (!verifyPkce(verifier, authCode.codeChallenge)) {
          return tokenError("invalid_grant", "PKCE verification failed");
        }

        const refreshToken = await issueRefreshToken(req.server.prisma, {
          userId: authCode.userId,
          clientId: authCode.clientId,
          scope: authCode.scope,
        });
        const accessToken = signAccessToken({
          userId: authCode.userId,
          clientId: authCode.clientId,
          scope: authCode.scope,
        });

        return reply.send({
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: ACCESS_TOKEN_TTL_SEC,
          refresh_token: refreshToken,
          scope: authCode.scope,
        });
      }

      if (grantType === "refresh_token") {
        const { refresh_token: refreshToken, client_id: clientId } = body;
        if (!refreshToken || !clientId) {
          return tokenError("invalid_request", "Missing required parameters");
        }

        // Atomically validate + revoke + issue the replacement in one
        // transaction (guards against refresh-token-reuse races).
        const rotated = await rotateRefreshToken(
          req.server.prisma,
          refreshToken,
          clientId,
        );
        if (!rotated) {
          return tokenError("invalid_grant", "Refresh token is invalid or expired");
        }

        const accessToken = signAccessToken({
          userId: rotated.userId,
          clientId,
          scope: rotated.scope,
        });

        return reply.send({
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: ACCESS_TOKEN_TTL_SEC,
          refresh_token: rotated.newToken,
          scope: rotated.scope ?? undefined,
        });
      }

      return tokenError("unsupported_grant_type");
    },
  );
};

export default oauthModule;
