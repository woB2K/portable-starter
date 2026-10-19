---
name: nuxt-patterns
description: Use when building or reviewing Nuxt 3 or Nuxt 4 SSR pages, server routes, hydration, runtime configuration, auth cookies, or Nitro data fetching.
---

# Nuxt and Nitro Patterns

## When to Use

Use for Nuxt pages, composables, `server/` routes, middleware, `nuxt.config`, and SSR/cache bugs. Inspect `package.json` and the lockfile first: identify Nuxt, Vue, Nitro, and H3 versions and the deployment adapter. Do not force a Nuxt 4 migration onto a Nuxt 3 project.

## How It Works

- For data rendered during SSR, prefer `useFetch` or `useAsyncData`; they transfer results through the payload and avoid a hydration duplicate. Use `$fetch` for user-triggered reads/writes. A top-level `$fetch` in setup can run on server and browser.
- A relative SSR `useFetch` can forward the incoming request’s relevant cookies/headers. Server-side `$fetch` does not automatically forward the browser cookie; forward only the required headers with the request-aware utility and handle `Set-Cookie` deliberately.
- Auth has two checks: establish the session from a trusted cookie/token, then authorize the requested resource for that user/tenant. Never treat a valid session as permission to access an arbitrary ID.
- Root `runtimeConfig` is server-only; `runtimeConfig.public` and serialized fetch/state payloads are client-visible. Keep secrets, tokens, and private profile data out of public config, `useState`, and page payloads.
- Never keep per-user SSR state in a module-global `Map`, singleton ref, or mutable cache. If caching personalized data is intentional, key by user/tenant and relevant inputs, bound it, invalidate it, and prove that instances cannot cross-leak. Database clients/pools may be process-scoped, but request transactions are not.
- Verify Nitro lifecycle APIs against the installed Nitro version and adapter. Register only documented hooks; do not assume a perpetual process, reliable shutdown, or a warm singleton in serverless/edge deployment.
- H3 error fields differ across versions. Check the installed H3 docs before changing `statusCode`, `status`, `statusMessage`, `message`, or `data`; do not mechanically “correct” one spelling.

## Examples

```ts
const { data: profile, status, error } = await useFetch('/api/me', {
  key: 'current-user',
})

async function save(input: ProfileInput) {
  return await $fetch('/api/me', { method: 'PATCH', body: input })
}
```

`@nuxt/test-utils` `registerEndpoint` is a mock: it proves a component’s interaction with a stub, not the real handler’s auth, cookie forwarding, cache isolation, or response headers. Use the package’s real-server E2E setup and `fetch`/`$fetch` when endpoint behavior itself matters.

## References

- https://nuxt.com/docs/3.x/getting-started/data-fetching
- https://nuxt.com/docs/4.x/getting-started/data-fetching
- https://nuxt.com/docs/4.x/getting-started/testing
- https://v1.h3.dev/guide/event-handler
