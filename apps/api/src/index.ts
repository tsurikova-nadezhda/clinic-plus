/**
 * Точка входа сервера. Применяет миграции, затем поднимает Hono на Bun.
 */
import app from "./app";
import { initDb } from "./db";

await initDb();

const server = Bun.serve(app);
console.log(`🚀 Clinic PLUS API on http://localhost:${server.port}`);
