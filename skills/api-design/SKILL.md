---
name: api-design
description: Use when designing or reviewing HTTP API contracts, validation, resource authorization, pagination, idempotency, concurrency, or public endpoint behavior.
---

# API Design

## When to Use

Use for new or changed HTTP endpoints, internal or public, especially when input is untrusted, clients retry, lists grow, or resources are tenant-scoped. Match the project’s established naming, media type, and error contract before inventing a new one.

## How It Works

- Treat the request as untrusted. Validate body, path, query, headers, and content type against an explicit contract; reject unknown fields when the contract requires it. Convert types deliberately and validate ranges, formats, and limits.
- Model resources with stable nouns and HTTP semantics. Choose status codes and error fields consistently; a project may use an envelope or a flat response—neither is mandatory. Never leak stack traces, SQL, tokens, or internal identifiers unintentionally.
- Authentication establishes identity; authorization checks the requested resource and tenant/ownership. A route is not safe merely because a JWT/API key guard ran. Mark intentionally public routes explicitly and still assess abuse, rate limits, and data sensitivity.
- Paginate every potentially large collection. Bound limits, use deterministic ordering with a unique tie-breaker, and choose cursor/keyset or offset based on client needs and workload. Treat cursors as opaque and validate filters/sorts from an allowlist.
- Design retries and concurrency: use an idempotency key or a naturally idempotent operation for retryable creates/actions, enforce uniqueness/atomic state transitions, and do not rely on check-then-act races. Define behavior for a reused key with a different payload, an in-progress request, and a failed retry; replay the stored response only when the contract permits it. POST is not inherently idempotent.
- Document the actual contract (OpenAPI or equivalent), including authorization, validation errors, conflict behavior, and deprecation policy.

## Examples

For `POST /orders`, validate an allowlisted body, authenticate the caller, authorize the account, and accept an idempotency key. In one transaction, enforce a unique `(account_id, idempotency_key)` constraint and return the existing result for a safe retry; do not promise this behavior without a persistence invariant.

For a public `GET /catalog`, omit auth only when the data and abuse model permit it. Still validate query parameters, bound page size, rate-limit as needed, and avoid assuming “public” means unrestricted internal fields.

## Review Checklist

- [ ] Explicit input and response contract, including unknown-field behavior
- [ ] Resource/tenant authorization independent of authentication
- [ ] Bounded, deterministic pagination and safe filter/sort allowlists
- [ ] Retry/idempotency and concurrent state transitions defined
- [ ] Public/authenticated decision intentional; no forced envelope

## References

- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods/POST
