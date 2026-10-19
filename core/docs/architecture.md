# Архитектура проекта

Заполни только принятые решения. Версии, команды и scope — в [старте проекта](project-start.md). Схема ниже текстовая: заменяй `TODO` фактами, не создавай лишние слои.

## Компоненты и ответственность

| Граница | Ответственность и фактический каталог |
|---|---|
| Vue / Nuxt UI | TODO — UI, клиентское состояние, SSR; Nuxt 3/4 и `srcDir` |
| Nitro, если используется | TODO — основной API ИЛИ тонкий BFF; `serverDir`, deployment preset |
| NestJS, если используется | TODO — доменные операции и API, границы модулей/DI |
| PostgreSQL + выбранный ORM | TODO — владелец схемы, соединений и миграций |
| Shared code | TODO — публичные типы/validation; без импорта server-only кода в UI |

При NestJS + Nitro укажи, кто владеет бизнес-правилами и данными. BFF может агрегировать API и обслуживать SSR/session, но не должен случайно стать вторым владельцем тех же миграций или дублировать authorization. Если два сервиса действительно пишут в БД, отдельно согласуй ownership и транзакционные границы.

## Data flow и API-контракт

- Один основной сценарий: браузер → TODO → backend → ORM → PostgreSQL → разрешённая projection → UI.
- Маршруты, HTTP semantics, DTO/schema, формат ошибок и место контракта: TODO.
- Runtime validation body/query/params и внешних ответов: TODO.
- Pagination, ограничения размера, idempotency и поведение повторов: TODO.
- Что сериализуется в Nuxt payload, что кешируется и как разделены пользователь/tenant: TODO.
- Какие cookie/headers BFF передаёт доверенному backend и как возвращает `Set-Cookie`: TODO.

## Auth и trust boundaries

- Источник identity, session/token lifecycle, logout/revocation: TODO.
- Где выполняется resource/tenant-level authZ для каждой операции: TODO.
- Cookie flags, CSRF при cookie-auth, CORS и публичные endpoints: TODO.
- Секреты и конфигурация: TODO — только имена/источники, никогда значения.
- Outbound URLs/redirects, upload paths и другие границы недоверенного ввода: TODO.

Клиентский route middleware — UX, не защита API. Server-only runtime config тоже может утечь через ответ, SSR state или лог; указывай разрешённые поля явно.

## Данные, миграции и concurrency

- ORM и версия, schema/entities и единственный владелец migration history: TODO.
- Создание миграции и её применение — отдельные действия; CI/deploy executor: TODO.
- Инварианты в constraints, transaction boundaries и выбранная стратегия конкуренции: TODO.
- Для изменения схемы: expand → совместимый код → backfill → проверка → contract.
- Ожидаемые locks, объём backfill, допустимый downtime, backup и проверенный recovery: TODO.
- TypeORM production: `synchronize: false`; Prisma: проверять generated SQL до deploy.

## Эксплуатация и решения

- Connection lifecycle/pooling на реплику и общий бюджет соединений: TODO.
- Для Nitro: совместимость драйвера с target, serverless reuse, shutdown при поддержке runtime: TODO.
- Timeouts, retry budget, rate limits, cache invalidation, логи без секретов/PII: TODO.
- Проверки readiness/health, наблюдаемость и путь восстановления: TODO.
- ADR нужен только для существенного выбора: контекст, варианты, решение, последствия.
