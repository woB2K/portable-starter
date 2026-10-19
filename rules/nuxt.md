---
paths:
  - "**/nuxt.config.*"
  - "apps/web/**"
---

# Nuxt 3/4 и Nitro

**До подключения адаптируй `apps/web/**` к фактическому Nuxt-пакету.** Это безопасный пример monorepo, а не универсальная структура. `**/nuxt.config.*` узнаёт конфиг; не расширяй серверный scope до всех `server/` в репозитории.

- Проверь версию и конфигурацию: Nuxt 4 обычно использует `app/` для UI, Nuxt 3 — корневые UI-каталоги; `srcDir`/`serverDir`/layers могут менять пути. Не мигрируй структуру автоматически.
- Учитывай auto-imports и aliases реального проекта; не предполагай установленный Pinia module или доступность API другой версии Nuxt/H3.
- **В UI/SSR-коде:** используй SSR-aware `useFetch`/`useAsyncData` для initial data, учитывай ключ, параметры и hydration; `$fetch` подходит для явных событий/операций. Не добавляй ключ вручную без причины, если `useFetch` уже выводит подходящий.
- **В UI/SSR-коде:** browser-only API вызывай в клиентском lifecycle/guard, не на server render. Не применяй эти клиентские приёмы к Nitro handler вместо серверной логики.
- **Для сериализуемых данных:** `runtimeConfig.public`, `app.config`, SSR state и ответы fetching видимы клиенту. Private runtime config не должен попадать туда косвенно.
- **В Nitro server routes:** валидируй body/query/params средствами выбранной версии; выполняй auth и resource/tenant authZ на сервере. Route middleware UI не защищает endpoint.
- **В server-side fetching/BFF:** передавай только необходимые headers/cookies доверенному origin; не проксируй credentials на пользовательский URL. Отдельно обработай backend `Set-Cookie` и SSRF/redirects.
- **Для cache/routeRules:** не кешируй персональные ответы общим ключом; проверь вариации по identity/tenant, invalidation и поведение deployment adapter.
- **Если Nitro работает с БД:** согласуй driver/target, reuse соединений, общий pool budget и доступный shutdown lifecycle. Не создавай connection на каждый запрос и не держи DB auth state между пользователями.
- **При NestJS + Nitro:** держи согласованную границу BFF/доменного API и одного владельца миграций; Nitro не обязан быть вторым полноценным backend.
- Тестируй SSR/hydration и важные реальные endpoints, включая запрет доступа и cache isolation. Mock endpoint проверяет потребителя, но не доказывает корректность production handler.

## Контроль scope

При исходном примере `apps/web/**`; после переноса в root адаптируй список в frontmatter.

| Путь | TypeScript | Vue | Nuxt |
|---|---|---|---|
| `apps/web/server/api/foo.ts` | да | нет | да, server concerns |
| `apps/web/app/pages/index.vue` (Nuxt 4) | да | да | да, UI/SSR concerns |
| `apps/web/pages/index.vue` (Nuxt 3) | да | да | да, UI/SSR concerns |
| `apps/api/src/foo.ts` (NestJS) | да | нет | нет |
| `pages/index.vue` (root Nuxt 3) | да | да | после замены на корневые UI paths |
| `app/pages/index.vue` (root Nuxt 4) | да | да | после замены на `app/**` |
| `server/api/foo.ts` (root Nitro) | да | нет | после добавления точного `server/**` |

Для root-проекта перечисли реально используемые `pages/**`, `layouts/**`, `components/**`, `composables/**`, `middleware/**`, `plugins/**`, `utils/**`, `assets/**`, `app.vue`, `app.config.*`, `error.vue` (Nuxt 3) либо `app/**`, `shared/**` (Nuxt 4), плюс `server/**` и нужные config paths. При custom `srcDir` используй реальные пути; не заменяй scope на `**`.
