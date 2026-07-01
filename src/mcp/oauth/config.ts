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

// https, or http on loopback for local dev (mirrors the redirect_uri policy
// enforced for OAuth clients in oauth/index.ts).
const parseUrl = (envVar: string, value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envVar} must be a valid URL, got: ${value}`);
  }
  const isLoopbackHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLoopbackHttp) {
    throw new Error(
      `${envVar} must be https (or http on localhost/127.0.0.1 for local dev), got: ${value}`,
    );
  }
  return url;
};

// Bare origin = no path, query, or fragment beyond "/". Required for the
// issuer and frontend origin, which are compared/concatenated as exact
// strings elsewhere (RFC 8414 metadata, redirect construction, Origin checks).
const parseBareOrigin = (envVar: string, value: string): string => {
  const stripped = stripTrailingSlash(value);
  const url = parseUrl(envVar, stripped);
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      `${envVar} must be a bare origin with no path/query/fragment, got: ${value}`,
    );
  }
  return stripped;
};

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

  // Validated but kept as the original string: unlike issuer/frontendOrigin,
  // resourceUri is never string-compared/concatenated, so no need to strip it
  // to a canonical bare-origin form.
  parseUrl("MCP_RESOURCE_URI", resourceUri as string);

  cached = {
    issuer: parseBareOrigin("MCP_OAUTH_ISSUER", issuer as string),
    resourceUri: resourceUri as string,
    frontendOrigin: parseBareOrigin("MCP_OAUTH_FRONTEND_ORIGIN", frontendOrigin as string),
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
