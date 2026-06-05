/**
 * Test preload — выставляет переменные окружения до загрузки app.ts.
 * DATABASE_URL не задаётся → используется встроенный PGlite (in-memory).
 */
process.env.JWT_SECRET ??= "test-secret-not-for-production";
process.env.ALLOWED_ORIGINS ??= "http://localhost:3000";
delete process.env.DATABASE_URL; // тесты всегда на PGlite
process.env.PGLITE_MEMORY = "1"; // тесты — in-memory (изолированно)
