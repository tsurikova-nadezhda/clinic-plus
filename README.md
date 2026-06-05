# Клиника ПЛЮС

Монорепозиторий (Bun workspaces). Единый источник правды — [SPEC.md](./SPEC.md).

## Структура

```
apps/api      — Bun + Hono + Drizzle backend  (трек A ✅)
apps/mobile   — Expo / React Native врача      (трек B ✅)
apps/admin    — React + Vite админка           (трек C ✅)
packages/shared — общие типы и zod-схемы
```

## Backend (apps/api)

БД: PostgreSQL. Локально/в тестах — встроенный **PGlite** (in-memory), без внешних
сервисов. Для прода задайте `DATABASE_URL` (Supabase/Neon) — драйвер переключится
автоматически ([db/index.ts](./apps/api/src/db/index.ts)).

```bash
bun install                       # из корня
cd apps/api
cp ../../.env.example .env         # задать JWT_SECRET и пр.
bun run db:generate               # сгенерировать миграции Drizzle из schema.ts
bun test                          # 45 тестов (TDD)
bun run dev                       # поднять API на :3001
```

Создать руководителя (admin создаётся только вручную, §6.3):

```bash
cd apps/api
ADMIN_EMAIL=boss@clinic.ru ADMIN_PASSWORD='StrongPass1!' bun run seed:admin
```

> Для dev используется файловый PGlite (`apps/api/.pglite`) — данные переживают
> перезапуск, поэтому seed-скрипт и сервер видят одну БД.

## Mobile (apps/mobile) — приложение врача

```bash
cd apps/mobile
bunx expo start            # затем Expo Go / эмулятор
# адрес API: EXPO_PUBLIC_API_URL или extra.apiUrl (дефолт http://localhost:3001)
```

5 табов (Главная, Активности, Мой путь, Новости, Практика); «Мой путь» — 3 вкладки
(План года / Дневник успеха / Архив). Брендинг и бизнес-правила §4/§6.

## Admin (apps/admin) — панель руководителя

```bash
cd apps/admin
bun run dev                # http://localhost:5173
# адрес API: VITE_API_URL (дефолт http://localhost:3001)
```

Вход только для admin. Управление врачами/планами/мероприятиями/новостями/кейсами + статистика (§8).

Безопасность — см. [docs/SECURITY-REVIEW.md](./docs/SECURITY-REVIEW.md) (по SPEC §6.3).
