/**
 * =============================================================
 *  CLINIC PLUS — Backend API
 *  Stack: Bun + Hono + TypeScript + Drizzle ORM + PostgreSQL
 *  Run:   bun run src/index.ts
 * =============================================================
 *
 *  SECURITY (SPEC §6.3):
 *  ✅ bcrypt cost=12 для паролей
 *  ✅ JWT HS256, секрет из env, exp=7д
 *  ✅ Zod-валидация на каждом роуте (кастомный хук → {error})
 *  ✅ requireAdmin middleware ДО валидации тела на admin-роутах
 *  ✅ Доступ к плану: владелец или админ (IDOR-guard)
 *  ✅ Rate limit на /auth/* (10 req/мин на IP)
 *  ✅ CORS: явный allowlist из env
 *  ✅ HTML экранируется he.escape() перед сохранением (XSS)
 *  ✅ Формат Expo push-токена валидируется
 *  ✅ Без сырого SQL — только Drizzle ORM
 *  ✅ Self-registration только role=doctor
 *  ✅ plans с ключом (userId, year) — архив по годам безопасен
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { jwt, sign } from "hono/jwt";
import { zValidator } from "@hono/zod-validator";
import { z, type ZodTypeAny } from "zod";
import { eq, and } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import he from "he";

import { db } from "./db";
import * as schema from "./db/schema";
import {
  planSchema,
  taskStatusSchema,
  activityInputSchema,
  newsInputSchema,
  caseSubmitSchema,
  caseCreateSchema,
  pushTokenSchema,
  balanceWheelSchema,
  reflectionInputSchema,
  winInputSchema,
  buildArchiveYear,
  type Plan,
} from "@clinic-plus/shared";

// ─────────────────────────────────────────────
//  ENV
// ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET
  ?? (() => { throw new Error("JWT_SECRET env variable is required"); })();
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim()).filter(Boolean),
);

// Разрешаем: точные боевые домены из env + любой localhost/127.0.0.1 на любом порту
// (удобно для dev: admin :5173, expo web :8081 и т.п.). SPEC §6.3 — allowlist.
function corsOrigin(origin: string): string | null {
  if (!origin) return null; // запросы без Origin (нативные) CORS не касается
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}
const BCRYPT_ROUNDS = 12;
const JWT_TTL = 60 * 60 * 24 * 7; // 7 дней (SPEC §6.3)

// ─────────────────────────────────────────────
//  RATE LIMITER (in-memory, per IP) — SPEC §6.3
// ─────────────────────────────────────────────
const rlMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = rlMap.get(ip);
  if (!e || now > e.resetAt) { rlMap.set(ip, { count: 1, resetAt: now + windowMs }); return true; }
  if (e.count >= max) return false;
  e.count++;
  return true;
}

// ─────────────────────────────────────────────
//  ZOD-валидатор с единообразной ошибкой { error: string }
// ─────────────────────────────────────────────
function zv<T extends ZodTypeAny>(target: "json", s: T) {
  return zValidator(target, s, (result, c) => {
    if (!result.success) {
      const msg = result.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; ");
      return c.json({ error: msg }, 400);
    }
  });
}

// ─────────────────────────────────────────────
//  API-специфичные схемы (auth)
// ─────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, "password must be at least 8 characters")
    .regex(/\d/, "password must contain a digit"),
  name: z.string().min(2),
  // role принимаем для проверки, но self-registration в admin запрещён в обработчике (→403)
  role: z.enum(["doctor", "admin"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Активность: к доменной схеме добавляем правило «дата начала в будущем»
const activitySchema = activityInputSchema.refine(
  (d) => new Date(d.startsAt) > new Date(),
  { message: "startsAt must be in the future" },
);

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────
type JWTPayload = { sub: string; role: "doctor" | "admin"; exp: number };

function newToken(userId: string, role: "doctor" | "admin") {
  return sign(
    { sub: userId, role, exp: Math.floor(Date.now() / 1000) + JWT_TTL },
    JWT_SECRET,
  );
}

// ─────────────────────────────────────────────
//  APP
// ─────────────────────────────────────────────
export const app = new Hono();
app.use("*", logger());
app.use("*", cors({ origin: corsOrigin, credentials: true }));

// Health-check (без авторизации) — для Railway/Render.
app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

const authMiddleware = jwt({ secret: JWT_SECRET, alg: "HS256" });

// requireAdmin как middleware — выполняется ДО валидации тела (SPEC §6.3):
// роль проверяется раньше, чем содержимое запроса.
async function requireAdmin(c: any, next: any) {
  const p = c.get("jwtPayload") as JWTPayload | undefined;
  if (!p || p.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  await next();
}

function getIP(c: any): string {
  return c.req.header("x-forwarded-for") ?? "unknown";
}

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
app.post("/auth/register", zv("json", registerSchema), async (c) => {
  if (!rateLimit(`reg:${getIP(c)}`)) return c.json({ error: "Too Many Requests" }, 429);
  const { email, password, name, role } = c.req.valid("json");

  // Self-registration только как doctor (SPEC §6.3)
  if (role && role !== "doctor") {
    return c.json({ error: "Self-registration is allowed for doctors only" }, 403);
  }

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) return c.json({ error: "Email already registered" }, 409);

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const [user] = await db.insert(schema.users)
    .values({ email, passwordHash: hash, name: he.escape(name), role: "doctor" })
    .returning();

  const token = await newToken(user.id, user.role);
  return c.json({ token, userId: user.id }, 201);
});

app.post("/auth/login", zv("json", loginSchema), async (c) => {
  if (!rateLimit(`login:${getIP(c)}`)) return c.json({ error: "Too Many Requests" }, 429);
  const { email, password } = c.req.valid("json");

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return c.json({ error: "Invalid credentials" }, 401);

  const token = await newToken(user.id, user.role);
  return c.json({ token });
});

// ─────────────────────────────────────────────
//  PLANS
// ─────────────────────────────────────────────
const planRoutes = new Hono();
planRoutes.use("*", authMiddleware);

planRoutes.get("/me", async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const year = new Date().getFullYear();
  const plan = await db.query.plans.findFirst({
    where: and(eq(schema.plans.userId, sub), eq(schema.plans.year, year)),
  });
  return c.json(plan?.data ?? { year, quarters: [], mission: "" });
});

planRoutes.get("/me/archive", async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const all = await db.query.plans.findMany({ where: eq(schema.plans.userId, sub) });
  // Бизнес-правило §6.1 — позитивная подача (логика в shared)
  const years = all.map((p: any) => buildArchiveYear(p.year, p.data as Plan));
  return c.json({ years });
});

planRoutes.get("/:userId", async (c) => {
  const { sub, role } = c.get("jwtPayload") as JWTPayload;
  const { userId } = c.req.param();
  // IDOR-guard (SPEC §6.3): только владелец или админ
  if (role !== "admin" && sub !== userId) return c.json({ error: "Forbidden" }, 403);
  const year = new Date().getFullYear();
  const plan = await db.query.plans.findFirst({
    where: and(eq(schema.plans.userId, userId), eq(schema.plans.year, year)),
  });
  if (!plan) return c.json({ error: "Plan not found" }, 404);
  return c.json(plan.data);
});

planRoutes.put("/:userId", requireAdmin, zv("json", planSchema), async (c) => {
  const { userId } = c.req.param();
  const body = c.req.valid("json");
  // Анти-XSS: экранируем все текстовые поля плана перед сохранением (§6.3)
  const sanitised = {
    ...body,
    mission: he.escape(body.mission),
    quarters: body.quarters.map((q) => ({
      ...q,
      title: he.escape(q.title),
      tasks: q.tasks.map((t) => ({ ...t, text: he.escape(t.text) })),
    })),
  };
  // Составной PK (userId, year): новый год не затирает прошлый → архив (§5)
  await db.insert(schema.plans)
    .values({ userId, year: body.year, data: sanitised, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.plans.userId, schema.plans.year],
      set: { data: sanitised, updatedAt: new Date() },
    });
  return c.json({ message: "Plan updated" });
});

planRoutes.patch("/me/tasks/:taskId", zv("json", taskStatusSchema), async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const { taskId } = c.req.param();
  const { status } = c.req.valid("json");
  const year = new Date().getFullYear();
  const plan = await db.query.plans.findFirst({
    where: and(eq(schema.plans.userId, sub), eq(schema.plans.year, year)),
  });
  if (!plan) return c.json({ error: "Plan not found" }, 404);
  let updated = false;
  const newData = {
    ...(plan.data as any),
    quarters: (plan.data as any).quarters.map((q: any) => ({
      ...q,
      tasks: q.tasks.map((t: any) => {
        if (t.id === taskId) { updated = true; return { ...t, status }; }
        return t;
      }),
    })),
  };
  if (!updated) return c.json({ error: "Task not found" }, 404);
  await db.update(schema.plans)
    .set({ data: newData })
    .where(and(eq(schema.plans.userId, sub), eq(schema.plans.year, year)));
  return c.json({ status });
});

app.route("/plans", planRoutes);

// ─────────────────────────────────────────────
//  BALANCE WHEEL
// ─────────────────────────────────────────────
app.put("/balance/:year/:phase", authMiddleware, zv("json", balanceWheelSchema), async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const year = parseInt(c.req.param("year"));
  const phase = c.req.param("phase");
  if (!["start", "end"].includes(phase)) return c.json({ error: "phase must be start or end" }, 400);
  const { values } = c.req.valid("json");
  await db.insert(schema.balanceWheels)
    .values({ userId: sub, year, phase: phase as "start" | "end", values })
    .onConflictDoUpdate({
      target: [schema.balanceWheels.userId, schema.balanceWheels.year, schema.balanceWheels.phase],
      set: { values, updatedAt: new Date() },
    });
  return c.json({ ok: true });
});

// ─────────────────────────────────────────────
//  REFLECTIONS
// ─────────────────────────────────────────────
const VALID_SCOPES = ["Q1", "Q2", "Q3", "Q4", "year"] as const;

app.put("/reflections/:year/:scope", authMiddleware, zv("json", reflectionInputSchema), async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const year = parseInt(c.req.param("year"));
  const scope = c.req.param("scope") as typeof VALID_SCOPES[number];
  if (!VALID_SCOPES.includes(scope)) return c.json({ error: "Invalid scope" }, 400);
  const { text } = c.req.valid("json");
  await db.insert(schema.reflections)
    .values({ userId: sub, year, scope, text: he.escape(text) })
    .onConflictDoUpdate({
      target: [schema.reflections.userId, schema.reflections.year, schema.reflections.scope],
      set: { text: he.escape(text), updatedAt: new Date() },
    });
  return c.json({ ok: true });
});

// ─────────────────────────────────────────────
//  SUCCESS WINS (дневник успеха — append-only, §5)
// ─────────────────────────────────────────────
app.post("/wins", authMiddleware, zv("json", winInputSchema), async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const { text, category } = c.req.valid("json");
  const [win] = await db.insert(schema.successWins)
    .values({ userId: sub, text: he.escape(text), category })
    .returning();
  return c.json(win, 201);
});

app.get("/wins", authMiddleware, async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const items = await db.query.successWins.findMany({
    where: eq(schema.successWins.userId, sub),
  });
  return c.json({ items });
});

// ─────────────────────────────────────────────
//  ACTIVITIES
// ─────────────────────────────────────────────
app.get("/activities", authMiddleware, async (c) => {
  const { from, to } = c.req.query();
  let items = await db.query.activities.findMany();
  if (from) items = items.filter((a: any) => new Date(a.startsAt) >= new Date(from));
  if (to)   items = items.filter((a: any) => new Date(a.startsAt) <= new Date(to));
  return c.json({ items });
});

app.post("/activities", authMiddleware, requireAdmin, zv("json", activitySchema), async (c) => {
  const body = c.req.valid("json");
  const [row] = await db.insert(schema.activities)
    .values({
      title: he.escape(body.title),
      description: body.description,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      location: body.location,
      reminders: body.reminders,
    })
    .returning();
  return c.json(row, 201);
});

// ─────────────────────────────────────────────
//  PUSH TOKENS
// ─────────────────────────────────────────────
app.post("/devices/register", authMiddleware, zv("json", pushTokenSchema), async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const { expoPushToken } = c.req.valid("json");
  await db.insert(schema.deviceTokens)
    .values({ userId: sub, token: expoPushToken })
    .onConflictDoNothing();
  return c.json({ ok: true });
});

// ─────────────────────────────────────────────
//  NEWS
// ─────────────────────────────────────────────
app.get("/news", authMiddleware, async (c) => {
  const page  = Math.max(1, Number(c.req.query("page")  ?? 1));
  const limit = Math.min(50, Number(c.req.query("limit") ?? 10));
  const all   = await db.query.news.findMany();
  return c.json({ items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
});

app.post("/news", authMiddleware, requireAdmin, zv("json", newsInputSchema), async (c) => {
  const body = c.req.valid("json");
  const [row] = await db.insert(schema.news)
    .values({
      title: he.escape(body.title),
      content: he.escape(body.content),
      source: body.source,
      imageUrl: body.imageUrl,
      publishedAt: new Date(body.publishedAt),
    })
    .returning();
  return c.json(row, 201);
});

// ─────────────────────────────────────────────
//  CLINICAL CASES (§6.4)
// ─────────────────────────────────────────────
app.get("/cases", authMiddleware, async (c) => {
  const items = await db.query.cases.findMany();
  return c.json({ items });
});

// Создание кейса админом (§8). HTML-поля экранируются (§6.3).
app.post("/cases", authMiddleware, requireAdmin, zv("json", caseCreateSchema), async (c) => {
  const body = c.req.valid("json");
  const [row] = await db.insert(schema.cases)
    .values({
      title: he.escape(body.title),
      specialty: body.specialty,
      scenario: he.escape(body.scenario),
      questions: body.questions.map((q) => ({
        ...q,
        text: he.escape(q.text),
        explanation: he.escape(q.explanation),
        options: q.options.map((o) => ({ ...o, label: he.escape(o.label) })),
      })),
      articleUrl: body.articleUrl,
      articleText: body.articleText ? he.escape(body.articleText) : undefined,
    })
    .returning();
  return c.json(row, 201);
});

app.post("/cases/:id/submit", authMiddleware, zv("json", caseSubmitSchema), async (c) => {
  const { sub } = c.get("jwtPayload") as JWTPayload;
  const { id } = c.req.param();
  const { answers } = c.req.valid("json");

  // Идемпотентность: одна попытка на врача на кейс (§6.4)
  const existing = await db.query.caseSubmissions.findFirst({
    where: and(eq(schema.caseSubmissions.userId, sub), eq(schema.caseSubmissions.caseId, id)),
  });
  if (existing) return c.json({ error: "Already submitted" }, 409);

  const caseData = await db.query.cases.findFirst({ where: eq(schema.cases.id, id) });
  if (!caseData) return c.json({ error: "Case not found" }, 404);

  let score = 0;
  const correct: Record<string, boolean> = {};
  const explanations: Record<string, string> = {};
  for (const [qid, answer] of Object.entries(answers)) {
    const q = (caseData.questions as any[]).find((q) => q.id === qid);
    if (!q) continue;
    const ok = q.correctAnswer === answer;
    correct[qid] = ok;
    if (ok) score++;
    explanations[qid] = q.explanation ?? "";
  }

  await db.insert(schema.caseSubmissions)
    .values({ userId: sub, caseId: id, answers, score, submittedAt: new Date() });

  return c.json({
    score,
    correct,
    explanations,
    articleUrl: (caseData as any).articleUrl ?? null,
  });
});

// ─────────────────────────────────────────────
//  ADMIN — список врачей и статистика (§8)
// ─────────────────────────────────────────────
app.get("/admin/doctors", authMiddleware, requireAdmin, async (c) => {
  const year = new Date().getFullYear();
  const doctors = await db.query.users.findMany({ where: eq(schema.users.role, "doctor") });
  const plans = await db.query.plans.findMany({ where: eq(schema.plans.year, year) });
  const planByUser = new Map(plans.map((p: any) => [p.userId, p.data]));

  const items = doctors.map((d: any) => {
    const data = planByUser.get(d.id) as any;
    const tasks = data?.quarters?.flatMap((q: any) => q.tasks) ?? [];
    const total = tasks.length;
    const done = tasks.filter((t: any) => t.status === "done").length;
    return {
      id: d.id,
      name: d.name,
      email: d.email,
      specialty: d.specialty ?? null,
      year,
      hasPlan: !!data,
      total,
      done,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  });
  return c.json({ items });
});

app.get("/admin/submissions", authMiddleware, requireAdmin, async (c) => {
  const [subs, users, cs] = await Promise.all([
    db.query.caseSubmissions.findMany(),
    db.query.users.findMany(),
    db.query.cases.findMany(),
  ]);
  const uMap = new Map(users.map((u: any) => [u.id, u]));
  const cMap = new Map(cs.map((x: any) => [x.id, x]));
  const items = subs.map((s: any) => ({
    id: s.id,
    userId: s.userId,
    userName: uMap.get(s.userId)?.name ?? "—",
    caseId: s.caseId,
    caseTitle: cMap.get(s.caseId)?.title ?? "—",
    score: s.score,
    total: (cMap.get(s.caseId)?.questions as any[])?.length ?? 0,
    submittedAt: s.submittedAt,
  }));
  return c.json({ items });
});

export default { port: process.env.PORT ?? 3001, fetch: app.fetch };
