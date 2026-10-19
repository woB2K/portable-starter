---
name: postgres-patterns
description: Use when designing or reviewing PostgreSQL schemas, constraints, indexes, query plans, pooling, permissions, or parameterized application queries.
---

# PostgreSQL Patterns

## When to Use

Use for PostgreSQL DDL/DML, slow list endpoints, schema constraints, connection pooling, and migration review. Check the PostgreSQL major version, driver behavior, workload, and deployment topology before prescribing settings.

## How It Works

- Let constraints enforce invariants: primary/foreign keys, `NOT NULL`, `CHECK`, and unique constraints are part of the data contract. Handle conflict errors at the service boundary.
- Parameterize all values; never interpolate user input into SQL identifiers or expressions. Use an allowlist for dynamic sort columns or identifiers. Give application roles only the schema/table privileges they need.
- Index for observed filters, joins, ordering, and selectivity—not by a universal checklist. A foreign key is not automatically a reason for an index; verify candidate indexes with representative `EXPLAIN (ANALYZE, BUFFERS)` and write overhead. Composite order follows the actual predicates and sort.
- Do not choose `bigint` for every ID. Use it when cardinality/range needs it; its values can exceed JavaScript’s safe integer range, so choose string-safe IDs/cursors and driver settings deliberately.
- Use a bounded pool sized for the database and all application instances. Set timeouts, observability, and transaction lifetime deliberately; never hold a connection while waiting on external I/O.
- Keyset pagination needs deterministic ordering and a matching predicate/index. Use `FOR UPDATE SKIP LOCKED` only for a queue’s claim semantics, not as a generic list optimization.
- PostgreSQL has no Supabase `auth.uid()` context by default. Implement application auth/tenant scope explicitly or configure a verified RLS design; do not paste provider-specific policies into a plain database.

## Examples

```sql
SELECT id, created_at, title
FROM posts
WHERE tenant_id = $1 AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT $4;

CREATE INDEX CONCURRENTLY posts_tenant_created_id_idx
  ON posts (tenant_id, created_at DESC, id DESC);
```

Validate the plan and write cost on realistic data. A concurrent index cannot run inside a transaction block; check the migration tool’s transaction mode and recovery path before using it.

## References

- https://www.postgresql.org/docs/current/indexes-intro.html
- https://www.postgresql.org/docs/current/datatype-numeric.html
- https://www.postgresql.org/docs/current/sql-createindex.html
