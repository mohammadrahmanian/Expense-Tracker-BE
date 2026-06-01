import mcpPlugin from "@platformatic/mcp";
import { FastifyPluginAsync } from "fastify";

import { registerReadTools } from "./tools/queries";
import { registerWriteTools } from "./tools/transactions";

// Bridges the existing Fastify backend to the MCP wire protocol.
// - Mounts POST /mcp + SSE (via @platformatic/mcp).
// - Validates incoming Bearer tokens against Auth0's JWKS (resource-server
//   role; Auth0 is the authorization server).
// - The plugin itself serves the RFC 9728 .well-known/oauth-protected-resource
//   document (and the /mcp-suffixed variant) when authorization is enabled,
//   and its auth preHandler skips .well-known paths so discovery stays public.
// - Registers the finance tools.
//
// Intentionally NOT wrapped with fastify-plugin: keeps the plugin's internal
// registrations confined so they don't leak into the rest of the app.
//
// Note: in-memory MCP sessions are used (no Redis). Acceptable on a single
// pm2 instance; switch to Redis if pm2 is moved to cluster mode or scaled
// to multiple VMs (see doc/private/server-env-and-reload.md).
export const mcpModule: FastifyPluginAsync = async (fastify) => {
  if (process.env.MCP_ENABLED === "false") {
    fastify.log.info("MCP server disabled via MCP_ENABLED=false");
    return;
  }

  const rawDomain = process.env.AUTH0_DOMAIN;
  const resourceUri = process.env.MCP_RESOURCE_URI;
  if (!rawDomain || !resourceUri) {
    throw new Error(
      "MCP server enabled but AUTH0_DOMAIN and/or MCP_RESOURCE_URI are not set"
    );
  }
  // Accept either bare host ("expensio.eu.auth0.com") or scheme-prefixed
  // ("https://expensio.eu.auth0.com[/]") to avoid building https://https://...
  const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  // @platformatic/mcp's internal well-known plugin registers @fastify/cors a
  // second time (only when authorization is enabled). The outer @fastify/cors
  // in app.ts already established two GLOBAL pieces of state that can't be
  // added twice:
  //   (a) the `corsPreflightEnabled` request decorator
  //   (b) the wildcard `OPTIONS *` preflight route
  // Swallow only those specific duplicates; the second cors instance's own
  // onRequest hook still functions because it only reads/writes the already-
  // existing property, and the outer OPTIONS handler already covers preflight
  // for every path.
  const originalDecorateRequest = fastify.decorateRequest.bind(fastify);
  (fastify as { decorateRequest: typeof fastify.decorateRequest }).decorateRequest =
    function patchedDecorateRequest(name: string, ...rest: unknown[]) {
      if (name === "corsPreflightEnabled" && fastify.hasRequestDecorator(name)) {
        return fastify;
      }
      return (originalDecorateRequest as (...a: unknown[]) => typeof fastify)(
        name,
        ...rest
      );
    } as typeof fastify.decorateRequest;

  const originalOptions = fastify.options.bind(fastify);
  (fastify as { options: typeof fastify.options }).options =
    function patchedOptions(url: string, ...rest: unknown[]) {
      try {
        return (originalOptions as (...a: unknown[]) => typeof fastify)(
          url,
          ...rest
        );
      } catch (err) {
        const code = (err as { code?: string } | null)?.code;
        if (url === "*" && code === "FST_ERR_DUPLICATED_ROUTE") {
          return fastify;
        }
        throw err;
      }
    } as typeof fastify.options;

  await fastify.register(mcpPlugin, {
    serverInfo: { name: "expensio-mcp", version: "1.0.0" },
    capabilities: { tools: {} },
    instructions:
      "Tools for querying a user's personal finances (transactions, categories, budgets, monthly aggregates) and logging new transactions.",
    enableSSE: true,
    authorization: {
      enabled: true,
      authorizationServers: [`https://${domain}/`],
      resourceUri,
      tokenValidation: {
        jwksUri: `https://${domain}/.well-known/jwks.json`,
        validateAudience: true,
      },
    },
  });

  registerReadTools(fastify);
  registerWriteTools(fastify);
};

export default mcpModule;
