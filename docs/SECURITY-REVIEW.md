# Security Review — Track A (Backend)

Проверка по **SPEC §6.3**. Дата: 2026-06-05. Статус: ✅ пройдено.

| # | Требование §6.3 | Статус | Где в коде |
|---|-----------------|--------|------------|
| 1 | Все тела запросов валидируются Zod | ✅ | `zv()` на каждом роуте с телом — [app.ts](../apps/api/src/app.ts); доменные схемы в [shared](../packages/shared/src/index.ts) |
| 2 | Admin-роуты защищены `requireRole("admin")` | ✅ | `requireAdmin` middleware на `PUT /plans/:userId`, `POST /activities`, `POST /news` |
| 3 | План доступен только владельцу или админу (IDOR) | ✅ | `role !== "admin" && sub !== userId → 403` в `GET /plans/:userId`; `PATCH /plans/me/tasks` и все профильные роуты скоупятся по `sub` из JWT |
| 4 | Пароли bcrypt cost 12 | ✅ | `BCRYPT_ROUNDS = 12`, `bcrypt.hash(password, 12)` |
| 5 | JWT HS256, exp 7 дней, секрет из env | ✅ | `jwt({ secret, alg: "HS256" })`; `JWT_TTL = 7д`; `JWT_SECRET` обязателен (бросает при отсутствии) |
| 6 | Rate limit на `/auth/*` (10/мин на IP) | ✅ | `rateLimit()` на `/auth/register` и `/auth/login` |
| 7 | HTML-поля экранируются (`he.escape`) перед сохранением | ✅ | name, mission, quarter.title, task.text, reflection, win, activity.title, news.title+content |
| 8 | Только Drizzle ORM, без сырого SQL | ✅ | Весь доступ к БД через Drizzle query builder; сырого SQL нет |
| 9 | Self-registration только `doctor`; `admin` — вручную | ✅ | `role === "admin" → 403`; при вставке всегда `role: "doctor"`; admin засевается напрямую в БД |

## Проверенные атаки (тесты `Security hardening`)
- Просроченный JWT → 401 ✅
- Подделанный JWT (изменённая подпись) → 401 ✅
- XSS: `<script>` в mission плана сохраняется экранированным ✅
- SQL-инъекция в логине отклоняется zod (невалидный email) → 400 ✅
- Rate limit: 11-я попытка авторизации → 429 ✅

## Замечания на будущее (не блокеры)
1. **Источник IP для rate limit.** `getIP` читает `x-forwarded-for`; при прямом подключении все клиенты попадают в бакет `"unknown"`. В проде задеплоить за доверенным прокси (Railway/Render задают заголовок) или брать IP из соединения. При масштабировании на несколько инстансов — вынести лимитер в Redis (сейчас in-memory, per-process).
2. **Подтверждение email / сброс пароля** — вне scope трека A, заложить при монетизации.
3. **Зависимость bcryptjs** (чистый JS) подходит для ≤500 пользователей; при росте нагрузки рассмотреть нативный `bcrypt`.
4. **Контроль размера тела запроса** (limit body size) на уровне прокси/Hono — добавить при деплое.
