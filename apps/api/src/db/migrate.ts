/**
 * Применить миграции Drizzle к целевой БД.
 * Использование: bun run src/db/migrate.ts
 */
import { initDb } from "./index";

await initDb();
console.log("✅ Migrations applied");
process.exit(0);
