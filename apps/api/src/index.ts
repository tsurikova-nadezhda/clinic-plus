/**
 * Точка входа сервера.
 *
 * Порядок важен для деплоя:
 *   1) проверка env + диагностика,
 *   2) СТАРТ сервера (чтобы /health отвечал сразу — healthcheck не ждёт БД),
 *   3) миграции + сидинг админа (после старта; ошибки логируются, сервер живёт),
 *   4) cron push (§6.2).
 */

// 1) Диагностика окружения — печатаем НАЛИЧИЕ переменных (без значений).
function present(keys: string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((k) => [k, Boolean(process.env[k])]));
}
console.log("[boot] env present:", present([
  "JWT_SECRET", "DATABASE_URL", "ALLOWED_ORIGINS", "ADMIN_EMAIL", "ADMIN_PASSWORD", "PORT",
]));

if (!process.env.JWT_SECRET) {
  console.error(
    "[boot] FATAL: JWT_SECRET не задан в окружении. " +
    "Railway → сервис → Variables → добавьте JWT_SECRET и передеплойте.",
  );
  process.exit(1);
}

// 2) Импорт app ПОСЛЕ проверки env (app.ts читает JWT_SECRET на верхнем уровне),
//    затем сразу поднимаем сервер.
const { default: app } = await import("./app");
const server = Bun.serve(app);
console.log(`[boot] 🚀 API слушает порт ${server.port} — /health готов`);

// 3) Миграции и сидинг — уже после старта сервера.
try {
  const { initDb } = await import("./db");
  await initDb();
  console.log("[boot] ✅ миграции Drizzle применены");

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const { ensureAdmin } = await import("./db/ensureAdmin");
    const r = await ensureAdmin(
      process.env.ADMIN_EMAIL,
      process.env.ADMIN_PASSWORD,
      process.env.ADMIN_NAME,
    );
    console.log(`[boot] 👤 admin ${process.env.ADMIN_EMAIL}: ${r}`);
  }
} catch (e) {
  console.error("[boot] ❌ ошибка инициализации БД (сервер продолжает работать, /health доступен):", e);
}

// 4) Серверный планировщик push-напоминаний (§6.2).
const { startScheduler } = await import("./lib/scheduler");
startScheduler();
