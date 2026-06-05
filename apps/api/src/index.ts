/**
 * Точка входа сервера: миграции → (опц.) сидинг админа → сервер → cron push.
 */
import app from "./app";
import { initDb } from "./db";
import { ensureAdmin } from "./db/ensureAdmin";
import { startScheduler } from "./lib/scheduler";

await initDb();

// Авто-сидинг руководителя при деплое, если заданы переменные (§6.3).
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const r = await ensureAdmin(
    process.env.ADMIN_EMAIL,
    process.env.ADMIN_PASSWORD,
    process.env.ADMIN_NAME,
  );
  console.log(`👤 admin ${process.env.ADMIN_EMAIL}: ${r}`);
}

const server = Bun.serve(app);
console.log(`🚀 Clinic PLUS API on http://localhost:${server.port}`);

// Серверный планировщик push-напоминаний (§6.2).
startScheduler();
