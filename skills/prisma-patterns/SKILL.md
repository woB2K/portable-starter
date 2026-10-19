---
name: prisma-patterns
description: Use when designing or reviewing Prisma schemas, queries, transactions, pagination, generated types, or migration boundaries in a TypeScript backend.
---

# Prisma Patterns

## When to Use

Use for Prisma schema/client work, multi-tenant queries, bulk writes, transactions, and pagination. Inspect `package.json`, lockfile, schema, generated client setup, and deployment runtime first. The referenced official API is Prisma ORM v7; do not assume a v7 detail applies to an older installed client.

## How It Works

- Select only fields the response needs and map records to response DTOs; never expose password hashes, tokens, soft-delete fields, or internal audit data by returning a raw entity.
- `findUnique` requires a unique selector, but modern `WhereUniqueInput` may accept additional non-unique filters alongside it. Do not retain a blanket ban on `{ id, tenantId }`; verify the generated type and version. If only the pair is unique, use the exact compound selector name generated from the schema.
- In an interactive `$transaction`, every database operation uses the callback’s transaction client (`tx`). Keep external HTTP, email, and other non-rollbackable effects outside; tune timeout/isolation only after checking the installed client and database.
- `updateMany`/`deleteMany` return counts, not records. If callers need rows, select IDs, perform the bulk write, then read a deliberate projection. If an `@updatedAt` invariant matters for bulk writes, set or verify the timestamp explicitly for the installed version and test it.
- Do not assume relation JOIN defaults, generator/client package names, adapter requirements, or performance characteristics. Inspect generated types/configuration and benchmark `include`/`select` or relation strategies on representative data.
- Use deterministic ordering with a unique tie-breaker for cursor pagination; bound limits. Scope every tenant/soft-delete predicate in the database query.
- Instantiate the client according to the project runtime and avoid per-request pools; serverless connection limits require a deployment-specific plan.

## Examples

```ts
const member = await prisma.member.findUnique({
  where: { id, tenantId }, // legal only if generated WhereUniqueInput permits it
  select: { id: true, displayName: true },
})

const result = await prisma.$transaction(async (tx) => {
  const row = await tx.member.update({ where: { id }, data: patch })
  return { id: row.id }
})
```

If the schema has `@@unique([id, tenantId], name: "tenant_member")`, use the generated `tenant_member` selector rather than guessing a key. Validate the concrete shape with the project’s generated client before editing queries.

## References

- https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference
- https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions
