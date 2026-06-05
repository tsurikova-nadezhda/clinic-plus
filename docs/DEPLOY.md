# Деплой backend (apps/api)

Стек: Bun + Hono + Drizzle. В проде — PostgreSQL (Supabase). Миграции применяются
автоматически при старте (`src/index.ts` → `initDb()`).

## Переменные окружения

| Переменная | Обязательна | Назначение | Пример |
|------------|:-----------:|------------|--------|
| `JWT_SECRET` | ✅ | Секрет подписи JWT (HS256). Длинная случайная строка. | `openssl rand -hex 32` |
| `DATABASE_URL` | ✅ | Строка подключения PostgreSQL (Supabase). | `postgresql://postgres.xxx:PASS@aws-0-...pooler.supabase.com:6543/postgres` |
| `ALLOWED_ORIGINS` | ✅ | CORS-allowlist (через запятую): адрес админки и т.п. | `https://admin.clinic.ru,http://localhost:5173` |
| `ADMIN_EMAIL` | ⚪ | Email руководителя — авто-создаётся при старте, если задан. | `boss@clinic.ru` |
| `ADMIN_PASSWORD` | ⚪ | Пароль руководителя (≥8 символов). | `StrongPass1!` |
| `ADMIN_NAME` | ⚪ | Имя руководителя. | `Руководитель ПЛЮС` |
| `PORT` | ⚪ | Порт. Railway/Render задают сами. | `3001` |
| `DB_POOL_MAX` | ⚪ | Размер пула соединений. | `10` |

> `JWT_SECRET` нужно один раз сгенерировать и больше не менять (иначе все
> выданные токены станут невалидными). Не коммитить в git.

## Шаг 1. Supabase (PostgreSQL)

1. Создайте проект на [supabase.com](https://supabase.com) (free tier).
2. **Project Settings → Database → Connection string → URI**. Возьмите строку
   **Connection pooling** (порт `6543`, режим *Transaction*) — код уже совместим
   (`prepare:false`, `ssl:require`). Подставьте пароль базы вместо `[YOUR-PASSWORD]`.
3. Это значение → `DATABASE_URL`.

Миграции применять вручную НЕ нужно — они накатываются при первом старте сервера
из `apps/api/drizzle/` (папка закоммичена). Локально можно прогнать так:
```bash
cd apps/api
DATABASE_URL='postgresql://...' bun run db:migrate
```

## Шаг 2а. Railway

1. New Project → **Deploy from GitHub repo** (репозиторий с этим монорепо).
2. Railway подхватит `railway.toml` (Dockerfile-сборка из `apps/api/Dockerfile`,
   healthcheck `/health`).
3. **Variables** → задайте `JWT_SECRET`, `DATABASE_URL`, `ALLOWED_ORIGINS`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD` (`PORT` Railway задаёт сам).
4. Deploy. Логи покажут `🚀 ... API`, `👤 admin ...: created`, `⏰ Push-планировщик`.

## Шаг 2б. Render (альтернатива)

1. New → **Blueprint** → укажите репозиторий (Render прочитает `render.yaml`),
   либо New → **Web Service** → Docker, Dockerfile path `./apps/api/Dockerfile`,
   context `.`.
2. В **Environment** задайте те же переменные (они помечены `sync:false`).
3. Create Web Service. Health-check — `/health`.

## Проверка после деплоя

```bash
curl https://<ваш-домен>/health
# {"ok":true,"ts":"..."}

curl -X POST https://<ваш-домен>/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"boss@clinic.ru","password":"StrongPass1!"}'
# {"token":"..."}  ← роль admin
```

## После деплоя

- В **admin** (`apps/admin`) задайте `VITE_API_URL=https://<ваш-домен>` и
  пересоберите (`bun run build`) — раздайте `dist/` на любом статик-хостинге
  (Netlify/Vercel/Cloudflare Pages).
- В **mobile** задайте `EXPO_PUBLIC_API_URL=https://<ваш-домен>` (или `extra.apiUrl`
  в `app.json`) перед сборкой EAS.
- Добавьте боевые домены админки в `ALLOWED_ORIGINS`.
