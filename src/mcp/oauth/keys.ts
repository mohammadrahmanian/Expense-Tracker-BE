import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import {
  ACCESS_TOKEN_TTL_SEC,
  getOAuthConfig,
} from "./config";

// Lazily derive the signing material from the configured PEM once. The access
// tokens are RS256 JWTs validated by @platformatic/mcp against our JWKS
// endpoint, so the `kid` here must match the one we publish in jwks().

type SigningKey = {
  privateKey: crypto.KeyObject;
  jwk: crypto.JsonWebKey & { kid: string; use: "sig"; alg: "RS256" };
  kid: string;
};

let cached: SigningKey | null = null;

// RFC 7638 JWK thumbprint — a stable, deterministic key id derived from the
// public key, so we don't need a separate env var to pin the `kid`.
const jwkThumbprint = (jwk: crypto.JsonWebKey): string => {
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  return crypto.createHash("sha256").update(canonical).digest("base64url");
};

const getSigningKey = (): SigningKey => {
  if (cached) return cached;

  const { privateKeyPem } = getOAuthConfig();
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const publicJwk = crypto
    .createPublicKey(privateKey)
    .export({ format: "jwk" }) as crypto.JsonWebKey;

  const kid = jwkThumbprint(publicJwk);
  cached = {
    privateKey,
    kid,
    jwk: { ...publicJwk, kid, use: "sig", alg: "RS256" },
  };
  return cached;
};

export const getJwks = (): { keys: crypto.JsonWebKey[] } => ({
  keys: [getSigningKey().jwk],
});

export const signAccessToken = (params: {
  userId: string;
  clientId: string;
  scope?: string | null;
}): string => {
  const { issuer, resourceUri } = getOAuthConfig();
  const { privateKey, kid } = getSigningKey();

  return jwt.sign(
    {
      scope: params.scope ?? undefined,
      azp: params.clientId,
      jti: crypto.randomUUID(),
    },
    privateKey,
    {
      algorithm: "RS256",
      keyid: kid,
      issuer,
      audience: resourceUri,
      subject: params.userId,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
    },
  );
};
