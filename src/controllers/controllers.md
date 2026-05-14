# Controller Guidelines

This document defines how controllers are implemented, maintained, and extended. Controllers are the boundary between HTTP and business logic — they must stay thin.

## Responsibility

A controller does exactly three things:

1. **Parse** — Extract params, query, and body from the request.
2. **Delegate** — Call service function(s) with the parsed data.
3. **Respond** — Send the appropriate status code and response body.

A controller must **never** contain business logic, database queries, or data transformations. All of that belongs in services. See `services.md` for service conventions.

## Function Signature

Controllers are async arrow functions exported as named constants. They receive `FastifyRequest` (with typed generics) and `FastifyReply`:

```typescript
export const createCategory = async (
  req: FastifyRequest<{ Body: Category }>,
  reply: FastifyReply,
) => {
  // ...
};
```

Use Fastify generics to type `Body`, `Params`, and `Querystring` as needed:

```typescript
req: FastifyRequest<{
  Body: { name: string };
  Params: { id: string };
  Querystring: { limit?: string };
}>
```

## Accessing Prisma and User

Every controller destructures `user` and `server` from `req`, then accesses `server.prisma` for database operations and `user.id` for ownership scoping:

```typescript
const { user, server } = req;
```

Pass `server.prisma` and `user.id` to service functions — never pass the full `req` or `server` objects.

## Field Extraction (Mass Assignment Prevention)

For **create** and **edit** operations, always destructure the specific fields you need from `req.body` and build an `allowedFields` object. Never spread or forward `req.body` directly:

```typescript
const { name, type, description } = req.body;
const allowedFields = { name, type, description };
```

For **edit** operations, filter out `undefined` values so only provided fields are updated:

```typescript
const allowedFields = Object.fromEntries(
  Object.entries({ name, type, description })
    .filter(([, value]) => value !== undefined),
);
```

## Error Handling

Every controller wraps its body in a single `try/catch`. The catch block follows this exact pattern:

```typescript
try {
  // parse, delegate, respond
} catch (error) {
  req.log.error(error);

  if (error instanceof Error && error.cause === "VALIDATION_ERROR") {
    return reply.status(400).send({
      error: "Bad Request",
      message: error.message,
      statusCode: 400,
    });
  }

  captureException(error);
  return reply.status(500).send({
    error: "Internal Server Error",
    message: "Something went wrong",
    statusCode: 500,
  });
}
```

### Rules

- **Always** call `req.log.error(error)` first.
- **Check expected error causes** before calling `captureException`. Currently the only expected cause is `"VALIDATION_ERROR"`. Expected errors are user errors (bad input, rule violations) — they must not be reported to Sentry.
- **Only call `captureException`** for unexpected errors (the `else` branch). This is the only place in the codebase where `captureException` should be called — never in services, utils, or plugins.
- Import `captureException` from `@sentry/node`.

### Error Cause → Status Code Mapping

| `error.cause`      | Status Code | `error` field          |
|---------------------|-------------|------------------------|
| `"VALIDATION_ERROR"` | 400         | `"Bad Request"`        |
| _(anything else)_   | 500         | `"Internal Server Error"` |

If new expected causes are added in the future, add them to this table and handle them in the catch block before the `captureException` fallback.

## Error Response Shape

All error responses use this shape:

```typescript
{
  error: string,       // HTTP status text (e.g. "Bad Request", "Internal Server Error")
  message: string,     // Human-readable description
  statusCode: number   // HTTP status code
}
```

## Status Codes

| Operation              | Success Code | Response Body                |
|------------------------|-------------|------------------------------|
| GET (single or list)   | 200         | The resource(s)              |
| POST (create)          | 201         | The created resource         |
| PUT / PATCH (update)   | 204         | Empty                        |
| DELETE                 | 204         | Empty                        |

## Adding a New Controller

1. Create the controller function in the appropriate file under `src/controllers/` (or add to an existing file if it belongs to the same domain).
2. Type the request generics (`Body`, `Params`, `Querystring`).
3. Parse the input — destructure params/query/body.
4. For create/edit: build `allowedFields` from destructured body fields.
5. Call the service function(s), passing `prisma`, `userId`, and the parsed data.
6. Return the response with the correct status code.
7. Wrap everything in the standard `try/catch` error handling block.
8. Register the controller as a handler in the corresponding route file under `src/routes/`.

## Reference Example

`createCategory` and `editCategory` in `categories.ts` are the canonical reference implementations. When in doubt, follow their structure.
