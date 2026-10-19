# Portable starter: TypeScript / Vue / Nuxt / NestJS

Небольшой самостоятельный набор знаний для Claude Code: Nuxt 3/4 + Vue 3, NestJS либо Nitro (или тонкий Nitro BFF рядом с NestJS), PostgreSQL и **Prisma ИЛИ TypeORM**. Это не приложение и не полная установка ECC: без зависимостей, installer, scaffolding и автоматической публикации.

## Быстрый старт

1. В целевом проекте сначала прочитай существующие инструкции/настройки. Сохрани их: этот набор не должен ничего перезаписывать.
2. Возьми обязательное ядро `core/` по карте ниже. Если `CLAUDE.md`/`docs` уже есть, вручную объедини полезные пункты, не заменяй файлы целиком.
3. Выбери **только используемые** rules и skills. Агенты и hooks не нужны для базового маршрута.
4. Заполни цель, версии, каталоги, deployment target и реальные команды в документах. Адаптируй Nuxt `paths` перед подключением правила.
5. Выполни канонические проверки **своего проекта** из записанных рабочих папок. Набор не создаёт scripts и не устанавливает инструменты.

В этом каталоге исходники неактивны: нет действующего вложенного `CLAUDE.md` или `.claude/`. Настройки начинают работать только после осознанного копирования в проект. Глобальная установка не требуется.

## Какие модули выбрать

| Сценарий                           | Что взять сверх ядра                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| Любой TS-проект                    | Опциональное правило `typescript.md`, включая script в `.vue`                          |
| Vue без Nuxt                       | По необходимости `vue.md` + `vue-patterns`                                             |
| Nuxt 3/4                           | По необходимости `vue.md`, `nuxt.md`, `vue-patterns`, `nuxt-patterns`                  |
| NestJS backend                     | `nestjs-patterns`; Nuxt/Nitro не является зависимостью                                 |
| Nitro backend/BFF                  | `nuxt-patterns`; NestJS не является зависимостью                                       |
| Работа с PostgreSQL/API/миграциями | Рекомендуются соответствующие `postgres-patterns`, `api-design`, `database-migrations` |
| Выбран Prisma                      | Только `prisma-patterns`, не TypeORM                                                   |
| Выбран TypeORM                     | Только `typeorm-patterns`, не Prisma                                                   |

Примеры выборки:

- **Nuxt/Nitro + Prisma:** ядро; TS/Vue/Nuxt rules; `vue-patterns`, `nuxt-patterns`, `prisma-patterns`, `postgres-patterns`, `api-design`, `database-migrations`.
- **Nuxt + NestJS + TypeORM:** ядро; TS/Vue/Nuxt rules; `vue-patterns`, `nuxt-patterns`, `nestjs-patterns`, `typeorm-patterns`, `postgres-patterns`, `api-design`, `database-migrations`. Если Nitro остаётся BFF, зафиксируй границу с NestJS.
- **NestJS без UI:** ядро; TS rule; `nestjs-patterns`, выбранный ORM и нужные shared skills. Vue/Nuxt модули не копируй.

Каждый skill самодостаточен: второй backend/ORM и другие модули не являются скрытой зависимостью.

## Карта копирования

Пути назначения указаны **от корня целевого проекта**. Копируй skill целой директорией, не один `SKILL.md`. При совпадении имени сначала сравни содержимое и объедини вручную; не используй слепое копирование с перезаписью.

| Источник в наборе                      | Точное назначение                                                                       | Выбор                             |
| -------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| `core/CLAUDE.md.template`              | `CLAUDE.md`                                                                             | Ядро                              |
| `core/docs/project-start.md`           | `docs/project-start.md`                                                                 | Ядро                              |
| `core/docs/architecture.md`            | `docs/architecture.md`                                                                  | Ядро                              |
| `rules/typescript.md`                  | `.claude/rules/typescript.md`                                                           | Опционально                       |
| `rules/vue.md`                         | `.claude/rules/vue.md`                                                                  | При Vue                           |
| `rules/nuxt.md`                        | `.claude/rules/nuxt.md`                                                                 | При Nuxt, после адаптации         |
| `skills/vue-patterns/`                 | `.claude/skills/vue-patterns/`                                                          | При Vue                           |
| `skills/nuxt-patterns/`                | `.claude/skills/nuxt-patterns/`                                                         | При Nuxt/Nitro                    |
| `skills/nestjs-patterns/`              | `.claude/skills/nestjs-patterns/`                                                       | При NestJS                        |
| `skills/prisma-patterns/`              | `.claude/skills/prisma-patterns/`                                                       | При Prisma                        |
| `skills/typeorm-patterns/`             | `.claude/skills/typeorm-patterns/`                                                      | При TypeORM                       |
| `skills/postgres-patterns/`            | `.claude/skills/postgres-patterns/`                                                     | При PostgreSQL                    |
| `skills/api-design/`                   | `.claude/skills/api-design/`                                                            | При API                           |
| `skills/database-migrations/`          | `.claude/skills/database-migrations/`                                                   | При миграциях                     |
| `agents/planner.md`                    | `.claude/agents/planner.md`                                                             | Опционально                       |
| `agents/stack-reviewer.md`             | `.claude/agents/stack-reviewer.md`                                                      | Опционально                       |
| `agents/security-reviewer.md`          | `.claude/agents/security-reviewer.md`                                                   | Опционально                       |
| `agents/database-reviewer.md`          | `.claude/agents/database-reviewer.md`                                                   | Опционально                       |
| `hooks/config-protection.cjs`          | `.claude/hooks/config-protection.cjs`                                                   | Opt-in                            |
| `hooks/check-console-log.cjs`          | `.claude/hooks/check-console-log.cjs`                                                   | Opt-in                            |
| `examples/settings.hooks.json.example` | Не копировать как активный settings; вручную перенести только выбранные entries `hooks` | Opt-in                            |
| `LICENSE`                              | `docs/third-party/portable-starter/LICENSE`                                             | Сохранить notice при переносе     |
| `SOURCES.md`                           | `docs/third-party/portable-starter/SOURCES.md`                                          | Сохранить provenance при переносе |

Лицензию приложения не заменяй. Сохраняй MIT notice и происхождение адаптированных материалов отдельно. Целевые `.claude/*` и `docs/*` здесь показаны как пути, а не ссылки на ещё не созданные файлы.

## Настрой scope Nuxt

[Правило Nuxt](rules/nuxt.md) содержит безопасный пример `apps/web/**` и baseline `**/nuxt.config.*`. **Замени пример на реальный каталог до установки.** Не используй `**/server/**/*.ts`: он захватит посторонний серверный код.

| Структура проекта                  | Scope вместо `apps/web/**`                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo, Nuxt в `apps/web/`       | Оставить `apps/web/**`; NestJS в `apps/api/` не попадает                                                                                                                          |
| Nuxt 4 в корне                     | Реальные `app/**`, `shared/**`, `server/**` и нужные config paths                                                                                                                 |
| Nuxt 3 в корне                     | Реальные `pages/**`, `layouts/**`, `components/**`, `composables/**`, `middleware/**`, `plugins/**`, `utils/**`, `assets/**`, `server/**`, `app.vue`, `app.config.*`, `error.vue` |
| Custom `srcDir`/`serverDir`/layers | Только фактические корни из конфигурации, не весь monorepo                                                                                                                        |

TypeScript rule охватывает `.ts` и `.vue`, Vue rule — `.vue`. Таблица конкретных положительных/отрицательных путей есть в Nuxt rule; server-only и client-only рекомендации внутри него условны по типу файла, не применяются ко всему пакету подряд.

## Необязательные агенты и один workflow

Все четыре агента ограничены `Read, Grep, Glob`, используют `model: sonnet` и ничего не меняют/не запускают. Основной исполнитель передаёт stack, scope/diff и результаты реальных команд. `stack-reviewer` покрывает и чистые server `.ts`, не требует парного агента.

`planner` — только fallback, когда никто ещё не владеет планом. Если уже используется Superpowers или другой workflow, оставь ему orchestration: не дублируй planning/TDD/review. Набор работает и без них, не требует конкретного имени плагина, обязательных subagents, checkpoint-коммитов или процента coverage. Prompt агента не является security sandbox.

## Hooks: по умолчанию выключены

Нужны только Node >=18 и Git для анализа изменений console-hook; внешних пакетов нет. [Пример регистрации](examples/settings.hooks.json.example) не активный settings. После чтения кода скопируй выбранные scripts, затем вручную объедини **только** выбранные entries `hooks` с существующим `.claude/settings.json`, сохранив остальные hooks, permissions и настройки.

- `config-protection.cjs`: PreToolUse `Write|Edit` запрещает изменение **существующих** ESLint/Prettier/Biome configs и ignore-файлов через exit 2; первое создание разрешено. Для легитимного изменения пользователь явно отключает hook, а не обходит его через Bash.
- `check-console-log.cjs`: Stop advisory для изменённых JS/TS/Vue-файлов; stdout JSON `systemMessage` и exit 0 показывают предупреждение без блокировки/нового модельного цикла. Только пути/строки, не содержимое исходников или payload; возможны ложные срабатывания.
- Это не общий write sandbox: Bash, embedded config в manifest и другие инструменты не защищены. Нет LLM, сети, autoformat, tmux или передачи данных наружу.
- В примере команда `node "${CLAUDE_PROJECT_DIR}/.claude/hooks/<name>.cjs"` quoted для путей с пробелами в macOS/Linux shell. Совместимость этой регистрации с Windows shell не предполагается; её нужно отдельно адаптировать и проверить.
- Чтобы выключить hook, вручную удали соответствующую entry регистрации; одного удаления script недостаточно.

## Проверки самого набора

Из корня **самого набора** (`portable-starter/` в ECC либо корень отдельного репозитория с его содержимым):

```bash
node --test tests/*.test.cjs
```

Локальные tests проверяют комплектность, контракты и hooks, а не работоспособность приложения/БД или эффективность prompts. В проекте выполняй его собственные проверки. Не подключай платные API-evals автоматически.

## Источники и лицензия

Адаптация выбранных материалов ECC, revision `76aaa77df6adc5b889e689007bf99b9a4f74af34`; не копия всего ECC. [SOURCES.md](SOURCES.md) содержит карту исходников, исправлений и официальные ссылки, [LICENSE](LICENSE) сохраняет MIT © 2026 Maxim Vershinin. TypeORM — оригинальное дополнение, Nitro — дополненная адаптация.

Для отдельного репозитория достаточно перенести содержимое этого каталога. Создание remote, коммиты, push и публикация — отдельные действия только с разрешения пользователя.
