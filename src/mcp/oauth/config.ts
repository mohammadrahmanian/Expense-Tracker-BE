// Centralised config for the self-hosted OAuth 2.1 authorization server that
// issues MCP access tokens. Both the OAuth plugin (src/mcp/oauth) and the
// @platformatic/mcp resource-server wiring (src/mcp/index.ts) read from here so
// the issuer/resource/JWKS values can never drift apart.

export type OAuthConfig = {
  // Authorization-server issuer = the bare backend origin (no trailing slash,
  // no path), e.g. https://api-staging.expensio.me. Must match what the RFC
  // 9728 protected-resource metadata advertises and the token `iss`.
  issuer: string;
  // Audience the MCP resource server validates against (= MCP_RESOURCE_URI).
  resourceUri: string;
  // Where to send the browser for the login + consent UI (frontend SPA route).
  frontendOrigin: string;
  // RS256 private key (PEM) used to sign access tokens. Separate from JWT_SECRET.
  privateKeyPem: string;
};

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

// Env vars holding a PEM are awkward with real newlines; allow the common
// "\n"-escaped single-line form and restore the newlines.
const normalizePem = (raw: string): string =>
  raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;

let cached: OAuthConfig | null = null;

export const getOAuthConfig = (): OAuthConfig => {
  if (cached) return cached;

  const issuer = process.env.MCP_OAUTH_ISSUER;
  const resourceUri = process.env.MCP_RESOURCE_URI;
  const frontendOrigin = process.env.MCP_OAUTH_FRONTEND_ORIGIN;
  const privateKeyRaw = process.env.MCP_OAUTH_PRIVATE_KEY;

  const missing = [
    ["MCP_OAUTH_ISSUER", issuer],
    ["MCP_RESOURCE_URI", resourceUri],
    ["MCP_OAUTH_FRONTEND_ORIGIN", frontendOrigin],
    ["MCP_OAUTH_PRIVATE_KEY", privateKeyRaw],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `MCP server enabled but required OAuth env vars are not set: ${missing.join(", ")}`,
    );
  }

  cached = {
    issuer: stripTrailingSlash(issuer as string),
    resourceUri: resourceUri as string,
    frontendOrigin: stripTrailingSlash(frontendOrigin as string),
    privateKeyPem: normalizePem(privateKeyRaw as string),
  };
  return cached;
};

// Token / request lifetimes.
export const ACCESS_TOKEN_TTL_SEC = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60; // 30 days
export const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000; // time to complete login+consent
export const AUTH_CODE_TTL_MS = 60 * 1000; // single-use code, exchanged immediately

export const CONSENT_PATH = "/oauth/consent";
