/**
 * Создание руководителя (admin) — единственный способ завести admin (SPEC §6.3).
 *
 * Использование:
 *   ADMIN_EMAIL=boss@clinic.ru ADMIN_PASSWORD='StrongPass1!' bun run seed:admin
 *
 * Работает против БД из DATABASE_URL (прод) или файлового .pglite (dev).
 * In-memory PGlite для этого не подходит — данные не переживут процесс.
 * Идемпотентно: если admin с таким email уже есть — ничего не делает.
 */
import { eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { db, initDb } from "./index";
import * as schema from "./schema";

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

const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
if (existing) {
  console.log(`ℹ️  Пользователь ${email} уже существует (role=${existing.role}). Пропускаю.`);
  process.exit(0);
}

const hash = await bcrypt.hash(password, 12);
await db.insert(schema.users).values({ email, passwordHash: hash, name, role: "admin" });
console.log(`✅ Admin создан: ${email}`);
process.exit(0);
