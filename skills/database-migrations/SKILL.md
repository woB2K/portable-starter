---
name: database-migrations
description: Use when planning or drafting database schema changes, expand-contract deploys, backfills, indexes, constraints, rollback, or migration-tool execution.
---

# Database Migrations

## When to Use

Use for schema or data changes on a shared database, especially populated production tables, renames, new constraints, indexes, and rolling deployments. First identify the database, ORM/tool, version, migration directory, deployment topology, and approved environment.

## How It Works

- Separate migration generation/drafting from application. Generation creates a reviewed artifact; application changes an environment. Never apply a migration, connect to a database, or run a production command without explicit approval for that environment.
- Prefer forward recovery in production: deployed migrations are immutable; repair with a new forward migration. Record whether a change is reversible, what backup/restore or compensating action exists, and how a failed step is detected.
- For a breaking rename or constraint, use expand–migrate–contract: add compatible nullable/new structure, deploy code that can read/write both, backfill in bounded idempotent batches, verify consistency, cut over reads, then remove the old structure in a later release.
- Keep schema DDL, long backfills, and application cutovers separately observable. Add `NOT NULL` only after existing rows satisfy it; use a `CHECK`/validation phase where the database supports it.
- Match index safety to the engine. PostgreSQL `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block and a failed build can leave an invalid index; configure the tool’s transaction mode deliberately, inspect failures, and define cleanup/retry.
- Use the selected ORM’s generated migration command only after checking its version. Do not silently substitute Prisma, TypeORM, or another tool’s workflow; never edit an already-applied migration.

## Examples

A populated `users.display_name` rename is drafted as: add `display_name`; deploy dual read/write code; backfill in batches with progress and retry safety; verify old/new values; switch reads; stop old writes; drop `username` later. The draft should name lock budget, observability, compatibility window, and forward-recovery plan.

A large PostgreSQL index draft must state that it runs outside a transaction, how the migration runner permits that, what happens if an invalid index remains, and who approved the target environment. Drafting those files is allowed; executing them is a separate approved action.

## References

- https://www.postgresql.org/docs/current/sql-createindex.html
- https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions
- https://typeorm.io/docs/migrations/setup/
