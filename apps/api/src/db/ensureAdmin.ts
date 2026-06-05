/**
 * Создание руководителя (admin) — единственный способ завести admin (SPEC §6.3).
 * Используется и CLI-скриптом (seedAdmin.ts), и авто-сидингом на старте (index.ts).
 * Идемпотентно: если пользователь с таким email есть — ничего не меняет.
 */
import { eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { db } from "./index";
import * as schema from "./schema";

export async function ensureAdmin(
  email: string,
  password: string,
  name = "Руководитель",
): Promise<"created" | "exists"> {
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return "exists";
  const hash = await bcrypt.hash(password, 12);
  await db.insert(schema.users).values({ email, passwordHash: hash, name, role: "admin" });
  return "created";
}
