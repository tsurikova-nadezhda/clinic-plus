# Клиника ПЛЮС

Монорепозиторий (Bun workspaces). Единый источник правды — [SPEC.md](./SPEC.md).

## Структура

```
apps/api      — Bun + Hono + Drizzle backend  (трек A ✅)
apps/mobile   — Expo / React Native врача      (трек B — шаг 2)
apps/admin    — React + Vite админка           (трек C — шаг 2)
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

Безопасность — см. [docs/SECURITY-REVIEW.md](./docs/SECURITY-REVIEW.md) (по SPEC §6.3).
