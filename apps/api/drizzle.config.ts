import { defineConfig } from "drizzle-kit";

// Генерация миграций из схемы. Подключение к БД не требуется для `generate`.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/clinic_plus",
  },
  verbose: true,
  strict: true,
});
