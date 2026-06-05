/**
 * CLI: создание руководителя (admin).
 *
 * Использование:
 *   ADMIN_EMAIL=boss@clinic.ru ADMIN_PASSWORD='StrongPass1!' bun run seed:admin
 *
 * Работает против БД из DATABASE_URL (прод) или файлового .pglite (dev).
 * In-memory PGlite не подходит — данные не переживут процесс.
 */
import { initDb } from "./index";
import { ensureAdmin } from "./ensureAdmin";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? "Руководитель";

if (!email || !password) {
  console.error("❌ Задайте ADMIN_EMAIL и ADMIN_PASSWORD в переменных окружения.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("❌ ADMIN_PASSWORD должен быть не короче 8 символов.");
  process.exit(1);
}

await initDb();
const result = await ensureAdmin(email, password, name);
console.log(result === "created" ? `✅ Admin создан: ${email}` : `ℹ️  ${email} уже существует. Пропускаю.`);
process.exit(0);
