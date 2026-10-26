# AetherSMP — сайт Minecraft SMP сервера

Полноценный сайт для игрового сообщества: каталог кастомных рас, личный кабинет игрока с привязкой
Minecraft-аккаунта и супер-админка (CMS) для управления всем контентом без правки кода.

**Стек:** Next.js 14 (App Router) · Express · PostgreSQL 16 · Prisma ORM · Tailwind CSS · Lucide Icons

---

## Содержание

- [Архитектура](#архитектура)
- [Структура проекта](#структура-проекта)
- [Схема базы данных](#схема-базы-данных)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Локальная разработка](#локальная-разработка)
- [Переменные окружения](#переменные-окружения)
- [REST API](#rest-api)
- [Безопасность](#безопасность)
- [Интеграция с Minecraft](#интеграция-с-minecraft)
- [Деплой на Ubuntu VPS](#деплой-на-ubuntu-vps)
- [Эксплуатация](#эксплуатация)

---

## Архитектура

```
                        ┌─────────────────────────────┐
   Браузер  ──HTTPS──▶  │  Caddy (reverse proxy, TLS) │
                        └──────────────┬──────────────┘
                                       │
                     ┌─────────────────┴──────────────────┐
                     ▼                                    ▼
        ┌────────────────────────┐          ┌────────────────────────┐
        │  web — Next.js 14      │          │  api — Express + TS    │
        │  • SSR лендинга и рас  │ ──/api──▶│  • JWT + Argon2        │
        │  • кабинет, админка    │  rewrite │  • RBAC middleware     │
        │  • прокси /api/*       │          │  • Zod-валидация       │
        └────────────────────────┘          │  • Prisma Client       │
                                            └───────────┬────────────┘
                                                        │
                        ┌───────────────────────────────┼──────────────────┐
                        ▼                               ▼                  ▼
              ┌──────────────────┐          ┌────────────────┐   ┌────────────────┐
              │ PostgreSQL 16    │          │ Mojang API     │   │ RCON → Paper   │
              │ (Prisma)         │          │ (ник + UUID)   │   │ (раса/ранг/бан)│
              └──────────────────┘          └────────────────┘   └────────────────┘
```

**Почему API отдельным сервисом.** Next.js проксирует `/api/*` в Express через `rewrites`
(см. `apps/web/next.config.mjs`). Для браузера всё same-origin — cookies работают без CORS-послаблений,
а Express можно масштабировать, перезапускать и тестировать независимо от фронтенда.

**Поток данных при смене расы:**

1. Клиент → `POST /api/me/race` (cookie с access-токеном + CSRF).
2. Express проверяет JWT → сверяет пользователя с БД (бан и удаление действуют мгновенно).
3. Проверяется кулдаун (7 дней) и доступность расы (`isActive` + `isSelectable`).
4. Запись обновляется в PostgreSQL, создаётся событие активности и уведомление.
5. Через RCON уходит команда выдачи новой расы и снятия старой.
6. Если RCON недоступен — операция **не откатывается**, игрок получает уведомление
   «применится при следующем входе», а ошибка попадает в системный лог.

---

## Структура проекта

```
aethersmp/
├── docker-compose.yml          # db + api + web + caddy
├── .env.example                # шаблон окружения
├── deploy/Caddyfile            # конфиг reverse-proxy с авто-TLS
├── package.json                # npm workspaces + общие скрипты
│
├── apps/api/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       # схема БД
│   │   ├── migrations/         # SQL-миграции (применяются migrate deploy)
│   │   └── seed.ts             # владелец + 5 рас + настройки
│   └── src/
│       ├── index.ts            # bootstrap + graceful shutdown
│       ├── app.ts              # сборка Express-приложения
│       ├── config/env.ts       # валидация окружения (Zod)
│       ├── lib/
│       │   ├── prisma.ts       # singleton PrismaClient
│       │   ├── password.ts     # Argon2id
│       │   ├── tokens.ts       # JWT, refresh, cookies, hashIp
│       │   ├── mojang.ts       # проверка ника + URL скинов
│       │   ├── rcon.ts         # RCON-клиент (Source RCON)
│       │   ├── audit.ts        # логи, уведомления, активность
│       │   ├── errors.ts       # AppError + error middleware
│       │   └── logger.ts       # pino с redact секретов
│       ├── middleware/
│       │   ├── auth.ts         # requireAuth / requireRole / requireOwner
│       │   ├── csrf.ts         # Origin + double-submit
│       │   └── rateLimit.ts    # лимиты на API и логин
│       ├── schemas/            # Zod-схемы запросов
│       ├── services/           # бизнес-логика рас и настроек
│       └── routes/
│           ├── auth.routes.ts  # регистрация, вход, refresh, logout
│           ├── me.routes.ts    # кабинет, смена расы, уведомления
│           ├── public.routes.ts# публичный каталог рас
│           ├── misc.routes.ts  # health, settings, mc/check, rcon status
│           └── admin/
│               ├── races.routes.ts    # CRUD рас (OWNER)
│               ├── users.routes.ts    # роли, бан, мут, раса, баланс
│               ├── settings.routes.ts # глобальные настройки (OWNER)
│               └── logs.routes.ts     # журнал + статистика
│
└── apps/web/
    ├── Dockerfile
    ├── next.config.mjs         # rewrites /api → Express
    ├── tailwind.config.ts      # дизайн-система (void / neon / ink)
    └── src/
        ├── app/
        │   ├── layout.tsx      # шрифты, провайдеры, шапка, футер
        │   ├── page.tsx        # лендинг (SSR)
        │   ├── races/          # каталог + [slug] детальная
        │   ├── login/ register/# auth (формы вынесены в *Form.tsx)
        │   ├── dashboard/      # личный кабинет
        │   ├── server/         # подключение
        │   └── admin/          # layout + обзор, users, races, settings, logs
        ├── components/
        │   ├── ui/             # RaceIcon, Toast
        │   ├── layout/         # SiteHeader, SiteFooter
        │   ├── races/          # RaceCard, StatRadar, AbilityList, ChooseRaceButton
        │   ├── auth/           # McNameField (проверка Mojang)
        │   ├── dashboard/      # RaceChangeDialog
        │   └── admin/          # RaceEditorDialog, UserManageDialog
        └── lib/
            ├── api.ts          # fetch-клиент + авто-refresh
            ├── auth-context.tsx# сессия и настройки сайта
            ├── types.ts        # общие типы
            └── utils.ts        # форматирование, cn()
```

---

## Схема базы данных

Полная схема — `apps/api/prisma/schema.prisma`. Модели:

| Модель | Назначение | Ключевые поля |
|---|---|---|
| `Race` | Кастомные расы (управляются через CMS) | `slug`, `stats Json`, `passives Json`, `actives Json`, `isActive`, `isSelectable` |
| `User` | Игрок или администратор | `mcName`, `mcUuid`, `role`, `status`, `raceId`, `balance`, `rank` |
| `Session` | Refresh-токены с ротацией | `refreshTokenHash` (SHA-256), `expiresAt`, `revokedAt` |
| `AuditLog` | Действия админов, входы, ошибки | `level`, `action`, `actorId`, `meta Json` |
| `Setting` | Глобальные переменные сайта | `key` (PK), `value Json` |
| `Notification` | Уведомления в кабинете | `type`, `title`, `readAt` |
| `ActivityEvent` | Лента активности профиля | `type`, `message` |

Связи: `User.raceId → Race.id` (`ON DELETE SET NULL`), `Session/Notification/ActivityEvent → User`
(`ON DELETE CASCADE`), `AuditLog.actorId → User` (`ON DELETE SET NULL`).

Миграция `prisma/migrations/*_init/migration.sql` — готовый SQL-дамп: его можно применить
и без Prisma CLI (`psql -f migration.sql`), если нужен ручной контроль.

---

## Быстрый старт (Docker)

```bash
git clone <ваш-репозиторий> aethersmp && cd aethersmp

# 1. Секреты
cp .env.example .env
# Замените минимум: POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
# RCON_PASSWORD, IP_HASH_SALT. Сгенерировать: openssl rand -hex 48

# 2. Поднять БД, API и веб
docker compose up -d --build

# 3. Применить миграции и заполнить базу
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed
```

Сайт: **http://localhost:3000** · API: **http://localhost:4000/api/health**

Данные владельца берутся из `.env` (`SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`).
**Смените пароль сразу после первого входа.**

---

## Локальная разработка

Нужны Node.js ≥ 20.11 и PostgreSQL 16 (или только Docker для БД).

```bash
# БД в Docker (порт 5432 проброшен на localhost)
docker compose up -d db

# Зависимости
npm install

# Окружение
cp .env.example .env      # DATABASE_URL указывает на localhost:5432

# Схема и данные
npm run db:migrate        # или npm run db:push для быстрой итерации
npm run db:seed

# API (:4000) и веб (:3000) одновременно
npm run dev
```

Полезные команды:

```bash
npm run db:studio    # Prisma Studio — визуальный редактор БД
npm run typecheck    # tsc --noEmit для api и web
npm run build        # production-сборка обоих приложений
```

> Первый запуск `npm install` может занять несколько минут: Argon2 и Prisma содержат
> нативные бинарники. На Alpine-образах нужны `python3 make g++` — они уже включены в Dockerfile.

---

## Переменные окружения

| Переменная | Обязательна | Описание |
|---|---|---|
| `DATABASE_URL` | да | Строка подключения PostgreSQL |
| `JWT_ACCESS_SECRET` | да | ≥ 32 символов, уникальный |
| `JWT_REFRESH_SECRET` | да | ≥ 32 символов, **другой**, чем access |
| `ACCESS_TOKEN_TTL` | нет | Время жизни access-токена (по умолчанию `15m`) |
| `REFRESH_TOKEN_TTL_DAYS` | нет | Срок refresh-сессии (по умолчанию 30) |
| `COOKIE_SECURE` | нет | `true` в production за HTTPS |
| `CORS_ORIGINS` | да | Белый список origin'ов через запятую |
| `API_INTERNAL_URL` | нет | Адрес API для Next-rewrites (в Docker — `http://api:4000`) |
| `RCON_ENABLED` | нет | Включает мост к игровому серверу |
| `RCON_HOST/PORT/PASSWORD` | при RCON | Доступ к RCON (см. `server.properties`) |
| `RCON_RACE_COMMAND` | нет | Шаблон команды, `{player}` и `{race}` подставляются |
| `ALLOW_UNVERIFIED_MC` | нет | `true` — разрешить регистрацию без проверки в Mojang |
| `IP_HASH_SALT` | да | Соль для хэширования IP в логах |

Все переменные валидируются на старте (`apps/api/src/config/env.ts`): при ошибке процесс
завершается с понятным сообщением, а не падает в рантайме.

---

## REST API

Базовый путь — `/api`. Аутентификация: httpOnly cookie `aether_at` (access) + `aether_rt` (refresh).

### Публичные

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/health` | Состояние API и БД |
| `GET` | `/settings` | Публичные настройки сайта |
| `GET` | `/races` | Активные расы + число игроков |
| `GET` | `/races/:slug` | Детальная раса |
| `POST` | `/mc/check` | Проверка ника в Mojang (лимит 20/мин) |

### Аутентификация

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/auth/register` | Регистрация + проверка ника + выбор расы |
| `POST` | `/auth/login` | Вход по email, логину или нику MC |
| `POST` | `/auth/refresh` | Ротация refresh-токена |
| `POST` | `/auth/logout` | Отзыв сессии |
| `GET` | `/auth/me` | Текущий пользователь |
| `POST` | `/auth/change-password` | Смена пароля (отзывает все сессии) |

### Личный кабинет (нужен токен)

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/me/dashboard` | Профиль, скины, статистика, уведомления, активность |
| `POST` | `/me/race` | Смена расы (кулдаун 7 дней) + RCON |
| `GET` | `/me/notifications` | Список уведомлений |
| `POST` | `/me/notifications/read` | Отметить прочитанными |
| `PATCH` | `/me/profile` | Био и аватар |

### Админка

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| `GET` | `/admin/races` | MODERATOR | Список рас для CMS |
| `POST` | `/admin/races` | **OWNER** | Создать расу |
| `PATCH` | `/admin/races/:id` | **OWNER** | Изменить расу |
| `DELETE` | `/admin/races/:id` | **OWNER** | Удалить (или деактивировать, если есть игроки) |
| `POST` | `/admin/races/:id/sync-all` | **OWNER** | RCON-синхронизация всех игроков расы |
| `GET` | `/admin/users` | MODERATOR | Список с фильтрами и пагинацией |
| `GET` | `/admin/users/:id` | MODERATOR | Карточка игрока |
| `PATCH` | `/admin/users/:id/role` | **OWNER** | Смена роли |
| `POST` | `/admin/users/:id/ban` | MODERATOR | Бан (+ опционально RCON) |
| `POST` | `/admin/users/:id/unban` | MODERATOR | Разбан |
| `POST` | `/admin/users/:id/mute` | MODERATOR | Мут |
| `POST` | `/admin/users/:id/unmute` | MODERATOR | Снять мут |
| `POST` | `/admin/users/:id/race` | MODERATOR | Принудительная смена расы |
| `POST` | `/admin/users/:id/rank` | MODERATOR | Выдать ранг |
| `POST` | `/admin/users/:id/balance` | MODERATOR | Начислить/списать монеты |
| `DELETE` | `/admin/users/:id` | **OWNER** | Удалить аккаунт |
| `GET`/`PATCH` | `/admin/settings` | **OWNER** | Глобальные настройки |
| `GET` | `/admin/logs` | ADMIN | Журнал с фильтрами |
| `GET` | `/admin/logs/stats` | ADMIN | Сводка для дашборда |

**Формат ошибок** (единый для всех эндпоинтов):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Проверьте правильность заполнения полей",
             "details": { "email": ["Некорректный email"] } } }
```

Коды: `VALIDATION_ERROR` (422), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `CSRF_ORIGIN`/`CSRF_MISSING`
(403), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

---

## Безопасность

| Угроза | Защита | Где |
|---|---|---|
| Кража пароля | Argon2id (19 MiB, t=2, p=1) | `lib/password.ts` |
| Брутфорс | 10 попыток / 15 мин на IP, неудачные не считаются при успехе | `middleware/rateLimit.ts` |
| Кража access-токена | 15 минут жизни, httpOnly + SameSite=Lax | `lib/tokens.ts` |
| Кража refresh-токена | В БД только SHA-256, ротация при каждом refresh, отзыв сессий | `routes/auth.routes.ts` |
| CSRF | Проверка Origin/Referer + double-submit с timing-safe сравнением | `middleware/csrf.ts` |
| SQL-инъекции | Prisma parameterized queries, `$queryRaw` только для `SELECT 1` | весь слой БД |
| XSS | React экранирует по умолчанию, `dangerouslySetInnerHTML` не используется; CSP в helmet | `app.ts` |
| Кликджекинг | `X-Frame-Options: DENY`, `frame-ancestors 'none'` | `app.ts`, `next.config.mjs` |
| Эскалация привилегий | `ROLE_WEIGHT` + запрет трогать равных и себя | `admin/users.routes.ts` |
| Утечка аккаунтов | Одинаковый ответ на неверный логин и пароль | `auth.routes.ts` |
| Утечка PII в логах | IP хэшируется с солью, pino redact для секретов | `lib/tokens.ts`, `lib/logger.ts` |
| DDoS на API | Общий лимит 300/мин + отдельные лимиты на чувствительные роуты | `middleware/rateLimit.ts` |

**Мгновенный отзыв доступа.** `requireAuth` сверяется с БД на каждом запросе: бан или удаление
аккаунта действует немедленно, даже если JWT ещё не истёк. При бане дополнительно отзываются
все сессии.

---

## Интеграция с Minecraft

### Проверка ника

При регистрации ник проверяется через `api.mojang.com/users/profiles/minecraft/:name`.
Сохраняются каноническое написание и UUID — это исключает регистрацию на чужой ник с другим
регистром. Скины рендерятся через Crafatar с фолбэком на Minotar.

### RCON-мост

Включается в `.env`:

```env
RCON_ENABLED=true
RCON_HOST=127.0.0.1
RCON_PORT=25575
RCON_PASSWORD=ваш_пароль
RCON_RACE_COMMAND=lp user {player} permission set race.{race} true
RCON_UNRACE_COMMAND=lp user {player} permission unset race.{race}
RCON_RANK_COMMAND=lp user {player} parent set {rank}
```

В `server.properties` игрового сервера:

```properties
enable-rcon=true
rcon.port=25575
rcon.password=ваш_пароль
```

Шаблон команды настраивается под ваш плагин: подойдёт LuckPerms (`lp user ...`),
PermissionsEx или собственная команда вроде `race set {player} {race}`.
Проверить связь можно в админке на странице «Обзор» или через `GET /api/status/rcon`.

> RCON по умолчанию слушает localhost. Не открывайте порт 25575 в интернет —
> подключайтесь через SSH-туннель или размещайте сайт на том же хосте.

---

## Деплой на Ubuntu VPS

### 1. Подготовка сервера

```bash
# Docker + Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Файрвол: наружу только 22, 80, 443
sudo ufw allow 22,80,443/tcp && sudo ufw enable
```

### 2. Код и окружение

```bash
sudo mkdir -p /srv/aethersmp && sudo chown $USER:$USER /srv/aethersmp
git clone <ваш-репозиторий> /srv/aethersmp && cd /srv/aethersmp

cp .env.example .env
nano .env
```

Обязательно для production:

```env
NODE_ENV=production
COOKIE_SECURE=true
CORS_ORIGINS=https://ваш-домен.ru
NEXT_PUBLIC_SITE_URL=https://ваш-домен.ru
POSTGRES_PASSWORD=<openssl rand -hex 24>
JWT_ACCESS_SECRET=<openssl rand -hex 48>
JWT_REFRESH_SECRET=<openssl rand -hex 48>
IP_HASH_SALT=<openssl rand -hex 16>
```

### 3. Запуск

```bash
docker compose --profile proxy up -d --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed
```

Перед этим укажите домен в `deploy/Caddyfile` — Caddy автоматически получит
сертификат Let's Encrypt.

### 4. Обновление

```bash
cd /srv/aethersmp
git pull
docker compose --profile proxy up -d --build
docker compose exec api npx prisma migrate deploy
```

### 5. Резервные копии

```bash
# Ежедневный дамп в 3:00
echo '0 3 * * * cd /srv/aethersmp && docker compose exec -T db pg_dump -U aether aethersmp | gzip > /srv/backups/db-$(date +\%F).sql.gz' | crontab -
```

Проверьте восстановление заранее: бэкап, который никогда не разворачивали, бэкапом не считается.

---

## Эксплуатация

**Первичная настройка после деплоя**

1. Войдите под аккаунтом владельца из `.env`.
2. Смените пароль: `/dashboard` → смена пароля (все прочие сессии отзовутся).
3. `/admin/settings` — название, IP, ссылки на Discord/VK.
4. `/admin/races` — проверьте расы, при необходимости отредактируйте или создайте свои.
5. `/admin` — убедитесь, что RCON-статус зелёный.

**Роли**

| Роль | Возможности |
|---|---|
| `OWNER` | Всё: CMS рас, настройки, роли, удаление аккаунтов |
| `ADMIN` | Журналы, модерация, просмотр рас |
| `MODERATOR` | Баны, муты, принудительная смена расы, баланс |
| `PLAYER` | Личный кабинет |

Роль `OWNER` проверяется в middleware **по значению из БД на каждом запросе**, а не по данным
из токена — понижение роли действует немедленно.

**Мониторинг**

- `GET /api/health` — 200 если БД доступна, 503 если нет (используется в Docker healthcheck).
- `/admin` — события уровня SECURITY за 24 часа, статус RCON.
- `/admin/logs` — фильтр по `SECURITY` покажет неудачные входы и смены ролей.

**Известные ограничения**

- Загрузка изображений (баннеры рас) работает по URL. Для загрузки файлов подключите S3-совместимое
  хранилище — сейчас файлового аплоада нет намеренно, чтобы не открывать запись на диск из API.
- Уведомления обновляются при загрузке страницы; WebSocket-пуш не реализован.
- Кулдаун смены расы (7 дней) задан константой `RACE_COOLDOWN_DAYS` в `routes/me.routes.ts`.

---

## Лицензия

Код предоставляется как есть для использования на вашем сервере. Проект не аффилирован с Mojang AB.
