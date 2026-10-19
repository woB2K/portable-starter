# Источники и адаптации

## Карта происхождения

| Файл/модуль набора                                    | Материалы ECC на указанной ревизии                                                                                                          | Характер адаптации                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `README.md`, `core/CLAUDE.md.template`, `core/docs/*` | Оригинальная компоновка переносимого набора; контекст `CLAUDE.md` и `CONTRIBUTING.md` ECC                                                   | Новые onboarding/проектные шаблоны без bootstrap и выдуманных команд                                |
| `rules/typescript.md`                                 | `rules/typescript/coding-style.md`, `rules/typescript/patterns.md`, `agents/typescript-reviewer.md`                                         | TS-контракты, async/границы ввода; добавлен `.vue`, убраны React и common-rule зависимости          |
| `rules/vue.md`                                        | `rules/vue/coding-style.md`, `rules/vue/patterns.md`, `agents/vue-reviewer.md`                                                              | Реактивность, composables, ownership; исправлены чрезмерные запреты и version-dependent утверждения |
| `rules/nuxt.md`, `skills/nuxt-patterns/SKILL.md`      | `skills/nuxt4-patterns/SKILL.md`, `rules/nuxt/patterns.md`, `rules/nuxt/security.md`, `rules/nuxt/testing.md`, `rules/nuxt/coding-style.md` | Nuxt 3/4 вместо обязательной v4; Nitro дополнен lifecycle/DB/auth/target; scoped server paths       |
| `skills/vue-patterns/SKILL.md`                        | `skills/vue-patterns/SKILL.md`                                                                                                              | Vue 3/Pinia без обязательного store style и запрета осмысленной мутации                             |
| `skills/nestjs-patterns/SKILL.md`                     | `skills/nestjs-patterns/SKILL.md`                                                                                                           | Modules/DI/DTO/guards/tests без ORM coupling и mandatory implicit conversion                        |
| `skills/prisma-patterns/SKILL.md`                     | `skills/prisma-patterns/SKILL.md`                                                                                                           | Projections, transactions, pagination/migrations с исправлением спорных утверждений                 |
| `skills/typeorm-patterns/SKILL.md`                    | **Не извлечён из ECC**                                                                                                                      | Оригинальное дополнение по TypeORM DataSource API 0.3 и официальной документации                    |
| `skills/postgres-patterns/SKILL.md`                   | `skills/postgres-patterns/SKILL.md`                                                                                                         | Общий PostgreSQL без зависимости от Supabase и универсального bigint/index mandate                  |
| `skills/api-design/SKILL.md`                          | `skills/api-design/SKILL.md`                                                                                                                | Контракты, validation, authZ, pagination/idempotency без обязательного envelope                     |
| `skills/database-migrations/SKILL.md`                 | `skills/database-migrations/SKILL.md`                                                                                                       | Expand/contract, backfill/recovery; создание отдельно от применения, только выбранный ORM           |
| `agents/planner.md`                                   | `agents/planner.md`, `agents/code-architect.md`                                                                                             | Только резервное read-only планирование, без конкурирующего workflow                                |
| `agents/stack-reviewer.md`                            | `agents/typescript-reviewer.md`, `agents/vue-reviewer.md`                                                                                   | Единый TS/Vue/Nuxt/Nest scope, в том числе pure server TS                                           |
| `agents/security-reviewer.md`                         | `agents/security-reviewer.md`                                                                                                               | Read-only evidence-based trust boundary review, без shell/аудита/эксплуатации                       |
| `agents/database-reviewer.md`                         | `agents/database-reviewer.md`                                                                                                               | Read-only ORM/SQL/schema/migration review, без подключения к БД                                     |
| `hooks/config-protection.cjs`                         | `scripts/hooks/config-protection.js`                                                                                                        | Самостоятельный opt-in PreToolUse; existing configs, bootstrap allowance, exit 2 denial             |
| `hooks/check-console-log.cjs`                         | `scripts/hooks/check-console-log.js`                                                                                                        | Самостоятельный opt-in Stop advisory без source/payload echo и блокирующего loop                    |
| `examples/settings.hooks.json.example`, `tests/*`     | Оригинальная регистрация и локальные regression/content tests                                                                               | Не подключаются к ECC runtime, без новых зависимостей                                               |

ECC database-reviewer и PostgreSQL материалы также отмечают [Supabase Agent Skills / postgres-best-practices](https://github.com/supabase/agent-skills/tree/main/skills/postgres-best-practices), MIT, credit: Supabase team. Здесь сохранены только адаптированные общие принципы PostgreSQL; Supabase-specific APIs и runtime не требуются.

## Существенные исправления источников

- Убраны автоматические агенты/парный review, остановка чтения при красных checks, shell/network действия reviewers, установка пакетов и auto-publish. Результаты канонических команд передаёт основной исполнитель.
- Нет обязательных TDD/checkpoint-коммитов, 80% coverage, фиксированного размера файлов, response envelope или repository layer. Один workflow владеет orchestration.
- Vue: разрешены корректные `ref`/`reactive`/Pinia mutations и оба вида stores; `watch` может принимать reactive object; props destructure учитывает Vue 3.5+.
- Prisma: не запрещается modern unique + non-unique filter; поведение `updateMany`, relation JOIN defaults и package/API availability не утверждается без проверки версии.
- Nuxt/Nitro: разделены UI и server concerns, версии 3/4 и actual dirs; authZ/cache isolation/DB lifecycle не подменяются route middleware. Mock endpoint не считается тестом production handler.
- PostgreSQL: типы и индексы выбираются по данным/workload; RLS и Supabase `auth.uid()` не универсальное требование. `down` не гарантирует восстановления данных.
- Hooks отделены от ECC wrapper/runtime: без LLM, сети, autoformat, tmux и активных settings; их узкие гарантии не выдаются за sandbox.

## Официальные первоисточники

Сверяй точное API с **установленной версией**, lockfile и deployment target. Эти ссылки — справочники, не скрытые runtime-зависимости.

- Claude Code: [проектные skills](https://code.claude.com/docs/en/skills), [subagents и tools/model frontmatter](https://code.claude.com/docs/en/sub-agents), [CLAUDE.md и path-scoped rules](https://code.claude.com/docs/en/memory), [hooks, exit codes и JSON output](https://code.claude.com/docs/en/hooks).
- TypeScript: [narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html), [tsconfig](https://www.typescriptlang.org/tsconfig/).
- Vue: [reactivity](https://vuejs.org/guide/essentials/reactivity-fundamentals.html), [watchers](https://vuejs.org/guide/essentials/watchers.html), [script setup / props destructure](https://vuejs.org/api/sfc-script-setup.html); Pinia: [state](https://pinia.vuejs.org/core-concepts/state.html).
- Nuxt: [документация и выбор версии](https://nuxt.com/docs), [runtime config](https://nuxt.com/docs/guide/going-further/runtime-config), [data fetching](https://nuxt.com/docs/getting-started/data-fetching), [testing](https://nuxt.com/docs/getting-started/testing).
- Nitro: [официальная документация, lifecycle и deployment](https://nitro.build/); H3: [официальная документация и версии](https://h3.dev/). Для Nuxt-проекта сверяй bundled Nitro/H3, не копируй latest API вслепую.
- NestJS: [validation](https://docs.nestjs.com/techniques/validation), [authorization](https://docs.nestjs.com/security/authorization), [testing](https://docs.nestjs.com/fundamentals/testing).
- Prisma: [transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions), [client reference](https://www.prisma.io/docs/orm/reference/prisma-client-reference), [migrations](https://www.prisma.io/docs/orm/prisma-migrate).
- TypeORM: [DataSource](https://typeorm.io/docs/data-source/data-source/), [transactions](https://typeorm.io/docs/advanced-topics/transactions/), [migrations](https://typeorm.io/docs/advanced-topics/migrations/).
- PostgreSQL: [constraints](https://www.postgresql.org/docs/current/ddl-constraints.html), [indexes](https://www.postgresql.org/docs/current/indexes.html), [EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html), [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

Совместимость правил/агентов и hook-контрактов сверена по документации Claude Code при подготовке. Локальные tests проверяют структуру и regression cases, не доказывают качество LLM-ответов или работу реального приложения; платные evals не выполняются автоматически.
