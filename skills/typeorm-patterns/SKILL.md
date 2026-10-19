---
name: typeorm-patterns
description: Use when building or reviewing TypeORM 0.3 DataSource configuration, repositories, transactions, NestJS integration, or production migrations.
---

# TypeORM 0.3 Patterns

## When to Use

Use only after checking the installed `typeorm` version and the project’s driver/CLI configuration. This is a version-pinned supplement, not an assertion that TypeORM 0.2 and 0.3 APIs are interchangeable.

## How It Works

- TypeORM 0.3 uses a `DataSource`; migration configuration should be explicit and separate from application bootstrap. The migration DataSource should set `synchronize: false` and load the runtime-specific migration path (source files for a TypeScript runner or compiled files in production). Do not load overlapping source and compiled files, which can run a migration twice.
- A transaction has a transaction-scoped manager. Every read and write participating in the unit of work must use that manager (or a repository obtained from it); an injected/global repository is not automatically enlisted.
- A `QueryRunner` gives explicit connection, start/commit/rollback, and release lifecycle. Use it only when callback-style transactions do not fit, and release it in a `finally` path. Confirm exact method signatures in the installed 0.3 docs before copying code.
- Nest repository injection is optional architecture, not a transaction boundary. Inject `DataSource`/repositories as the project chooses, but pass the transactional manager down to repository methods instead of hiding a global repository call inside them.
- Keep migrations immutable after deployment. Do not enable `synchronize` in production; use reviewed migration files and an environment-approved runner. `migrationsRun` and transaction mode are deployment decisions, not universal defaults.
- Keep external calls outside database transactions; use an outbox when a durable post-commit effect is required.

## Examples

Conceptual review target (verify names against the installed TypeORM 0.3 docs):

1. Start one unit of work from the `DataSource` or a `QueryRunner`.
2. Pass its manager to every repository operation, including authorization reads and related writes.
3. Commit only after all invariants hold; roll back on error; release an explicit runner.

A migration configuration should export a dedicated `DataSource` with `synchronize: false`, a `migrations` glob covering source and compiled files, and a deliberate transaction mode. Generate/draft locally; apply only through the project’s approved environment process.

## References

- https://typeorm.io/docs/migrations/setup/

The official transaction page was not available during curation, so this skill intentionally gives the transaction boundary and lifecycle concepts without an unverified copy-paste API. Re-check the current TypeORM 0.3 transaction documentation before implementation.
