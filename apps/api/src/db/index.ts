/**
 * DB-подключение.
 *
 * - Прод: PostgreSQL (Supabase/Neon) через postgres-js, если задан DATABASE_URL.
 * - Dev / тесты: встроенный PGlite (in-memory PostgreSQL), без внешних зависимостей.
 *
 * Схема и запросы (Drizzle ORM) одинаковы для обоих драйверов.
 * SPEC §2 (Drizzle ORM, без сырого SQL), §6.3.
 */
import { join } from "node:path";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
const migrationsFolder = join(import.meta.dir, "..", "..", "drizzle");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any;
let _migrate: () => Promise<void>;

if (DATABASE_URL) {
  // ── Production: PostgreSQL ──
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(DATABASE_URL);
  _db = drizzle(client, { schema });
  _migrate = () => migrate(_db, { migrationsFolder });
} else {
  // ── Dev / tests: PGlite (in-memory) ──
  const { drizzle } = await import("drizzle-orm/pglite");
  const { PGlite } = await import("@electric-sql/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite();
  _db = drizzle(client, { schema });
  _migrate = () => migrate(_db, { migrationsFolder });
}

export const db = _db;

let _initialized = false;
/** Применяет миграции Drizzle (идемпотентно). Вызывать перед использованием БД. */
export async function initDb(): Promise<void> {
  if (_initialized) return;
  await _migrate();
  _initialized = true;
}
