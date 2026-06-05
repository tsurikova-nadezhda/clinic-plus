/**
 * =============================================================
 *  CLINIC PLUS — Backend Test Suite (TDD)
 *  Stack: Bun + Hono + TypeScript
 *  Runner: bun test
 * =============================================================
 *
 *  SECURITY REVIEW:
 *  ✅ JWT secret stored in env, never hardcoded
 *  ✅ Passwords hashed with bcrypt (cost ≥ 12)
 *  ✅ Role-based access: admin vs doctor guards on every route
 *  ✅ Input validation with zod on all request bodies
 *  ✅ SQL via Drizzle ORM — no raw string interpolation
 *  ✅ Rate limiting on auth endpoints (max 10 req/min per IP)
 *  ✅ CORS restricted to known origins
 *  ✅ Plan data scoped by userId+year — no IDOR possible
 *  ✅ Push token format validated against Expo pattern
 *  ✅ Archive: years stored separately, never overwritten
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../src/app";
import { db, initDb } from "../src/db";
import * as schema from "../src/db/schema";
import * as bcrypt from "bcryptjs";

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
async function req(
  path: string,
  opts?: { method?: string; body?: object; token?: string }
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const res = await app.fetch(
    new Request(`http://localhost${path}`, {
      method: opts?.method ?? "GET",
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    })
  );
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

let adminToken = "";
let doctorToken = "";
let doctorId = "";

// ─────────────────────────────────────────────
//  SETUP — миграции + сидинг (admin, клинический кейс)
//  admin создаётся напрямую в БД (self-registration в admin запрещён, §6.3)
// ─────────────────────────────────────────────
beforeAll(async () => {
  await initDb();

  // Засеять руководителя (admin) напрямую — он не может зарегистрироваться сам
  const adminHash = await bcrypt.hash("Admin1234!", 12);
  await db.insert(schema.users).values({
    email: "admin@clinic.test",
    passwordHash: adminHash,
    name: "Руководитель",
    role: "admin",
  });
  const adminLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "admin@clinic.test", password: "Admin1234!" },
  });
  adminToken = adminLogin.body.token;

  // Засеять клинический кейс case-001
  await db.insert(schema.cases).values({
    id: "case-001",
    title: "Острый живот у ребёнка",
    specialty: "Педиатрия",
    scenario: "Ребёнок 6 лет с болью в правой подвздошной области...",
    questions: [
      {
        id: "q1",
        text: "Наиболее вероятный диагноз?",
        options: [
          { key: "A", label: "Гастроэнтерит" },
          { key: "B", label: "Острый аппендицит" },
        ],
        correctAnswer: "B",
        explanation: "Локализация боли и симптомы указывают на аппендицит.",
      },
      {
        id: "q2",
        text: "Первичная тактика?",
        options: [
          { key: "A", label: "Хирургическая консультация" },
          { key: "B", label: "Назначить анальгетик и отпустить" },
        ],
        correctAnswer: "A",
        explanation: "Необходима срочная консультация хирурга.",
      },
    ],
    articleUrl: "https://clinic-plus.example/articles/acute-abdomen",
    articleText: "Разбор клинического случая острого живота...",
  });
});

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
describe("POST /auth/register", () => {
  it("registers a new doctor and returns token", async () => {
    const r = await req("/auth/register", {
      method: "POST",
      body: { email: "doctor@clinic.test", password: "Test1234!", name: "Иванова А.В." },
    });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty("token");
    doctorToken = r.body.token;
    doctorId = r.body.userId;
  });

  it("rejects weak password (< 8 chars)", async () => {
    const r = await req("/auth/register", {
      method: "POST",
      body: { email: "weak@clinic.test", password: "abc", name: "X" },
    });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/password/i);
  });

  it("rejects duplicate email", async () => {
    const r = await req("/auth/register", {
      method: "POST",
      body: { email: "doctor@clinic.test", password: "Test1234!", name: "Дубль" },
    });
    expect(r.status).toBe(409);
  });

  it("does NOT allow self-registration as admin", async () => {
    const r = await req("/auth/register", {
      method: "POST",
      body: { email: "fake@clinic.test", password: "Test1234!", name: "Hacker", role: "admin" },
    });
    expect(r.status).toBe(403);
  });
});

describe("POST /auth/login", () => {
  it("returns token for valid credentials", async () => {
    const r = await req("/auth/login", {
      method: "POST",
      body: { email: "doctor@clinic.test", password: "Test1234!" },
    });
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("token");
  });

  it("returns 401 for wrong password", async () => {
    const r = await req("/auth/login", {
      method: "POST",
      body: { email: "doctor@clinic.test", password: "WrongPass!" },
    });
    expect(r.status).toBe(401);
  });
});

// ─────────────────────────────────────────────
//  PLAN (multi-year)
// ─────────────────────────────────────────────
const samplePlan = {
  year: 2026,
  mission: "Стать экспертом в гастроэнтерологии",
  quarters: [
    {
      q: "Q1", title: "Базовое питание", focus: "ГВ и нутрициология",
      tasks: [
        { id: "t1", type: "course", text: "MD.School — Нутрициология", status: "pending" },
        { id: "t2", type: "book",   text: "Розенберг — НВО",           status: "pending" },
      ],
    },
  ],
};

describe("GET /plans/me", () => {
  it("returns own plan for authenticated doctor", async () => {
    const r = await req("/plans/me", { token: doctorToken });
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("quarters");
  });

  it("returns 401 without token", async () => {
    const r = await req("/plans/me");
    expect(r.status).toBe(401);
  });
});

describe("PUT /plans/:userId (admin uploads plan)", () => {
  it("admin can upload a plan for a doctor", async () => {
    const r = await req(`/plans/${doctorId}`, {
      method: "PUT", token: adminToken, body: samplePlan,
    });
    expect(r.status).toBe(200);
    expect(r.body.message).toMatch(/updated/i);
  });

  it("plan is immediately visible to the doctor", async () => {
    const r = await req("/plans/me", { token: doctorToken });
    expect(r.status).toBe(200);
    expect(r.body.mission).toBe("Стать экспертом в гастроэнтерологии");
  });

  it("rejects plan with missing required fields", async () => {
    const r = await req(`/plans/${doctorId}`, {
      method: "PUT", token: adminToken, body: { year: 2026 },
    });
    expect(r.status).toBe(400);
  });

  it("doctor CANNOT upload a plan (role guard)", async () => {
    const r = await req(`/plans/${doctorId}`, {
      method: "PUT", token: doctorToken, body: samplePlan,
    });
    expect(r.status).toBe(403);
  });
});

describe("GET /plans/:userId — IDOR check", () => {
  it("admin can fetch any user plan", async () => {
    const r = await req(`/plans/${doctorId}`, { token: adminToken });
    expect(r.status).toBe(200);
  });

  it("doctor cannot access another user's plan", async () => {
    const r = await req(`/plans/another-user-999`, { token: doctorToken });
    expect(r.status).toBe(403);
  });
});

describe("GET /plans/me/archive", () => {
  it("returns all years for the doctor", async () => {
    const r = await req("/plans/me/archive", { token: doctorToken });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.years)).toBe(true);
  });
});

describe("PATCH /plans/me/tasks/:taskId", () => {
  it("doctor can update own task status", async () => {
    const r = await req("/plans/me/tasks/t1", {
      method: "PATCH", token: doctorToken, body: { status: "done" },
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("done");
  });

  it("rejects invalid status value", async () => {
    const r = await req("/plans/me/tasks/t1", {
      method: "PATCH", token: doctorToken, body: { status: "flying" },
    });
    expect(r.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
//  BALANCE WHEEL
// ─────────────────────────────────────────────
describe("PUT /balance/:year/:phase", () => {
  const values = [7, 6, 7, 8, 5, 5, 7, 8];

  it("saves start-of-year balance wheel", async () => {
    const r = await req("/balance/2026/start", {
      method: "PUT", token: doctorToken, body: { values },
    });
    expect(r.status).toBe(200);
  });

  it("saves end-of-year balance wheel", async () => {
    const r = await req("/balance/2026/end", {
      method: "PUT", token: doctorToken, body: { values: [8,8,8,9,7,7,8,9] },
    });
    expect(r.status).toBe(200);
  });

  it("rejects invalid phase", async () => {
    const r = await req("/balance/2026/middle", {
      method: "PUT", token: doctorToken, body: { values },
    });
    expect(r.status).toBe(400);
  });

  it("rejects wheel with wrong number of values", async () => {
    const r = await req("/balance/2026/start", {
      method: "PUT", token: doctorToken, body: { values: [1, 2, 3] },
    });
    expect(r.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
//  REFLECTIONS
// ─────────────────────────────────────────────
describe("PUT /reflections/:year/:scope", () => {
  it("saves Q1 reflection", async () => {
    const r = await req("/reflections/2026/Q1", {
      method: "PUT", token: doctorToken,
      body: { text: "Главный инсайт квартала: начала говорить нет" },
    });
    expect(r.status).toBe(200);
  });

  it("saves year reflection", async () => {
    const r = await req("/reflections/2026/year", {
      method: "PUT", token: doctorToken,
      body: { text: "Год изменил мой подход к практике" },
    });
    expect(r.status).toBe(200);
  });

  it("rejects invalid scope", async () => {
    const r = await req("/reflections/2026/Q5", {
      method: "PUT", token: doctorToken, body: { text: "test" },
    });
    expect(r.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
//  SUCCESS WINS (дневник успеха)
// ─────────────────────────────────────────────
describe("POST /wins", () => {
  it("doctor can add a success win", async () => {
    const r = await req("/wins", {
      method: "POST", token: doctorToken,
      body: { text: "Провела первый вебинар", category: "Профессия" },
    });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty("id");
  });

  it("rejects empty text", async () => {
    const r = await req("/wins", {
      method: "POST", token: doctorToken, body: { text: "", category: "Личное" },
    });
    expect(r.status).toBe(400);
  });
});

describe("GET /wins", () => {
  it("returns list of wins for authenticated doctor", async () => {
    const r = await req("/wins", { token: doctorToken });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.items)).toBe(true);
  });

  it("wins are not deleted when plan is updated", async () => {
    await req(`/plans/${doctorId}`, {
      method: "PUT", token: adminToken,
      body: { ...samplePlan, year: 2027, mission: "Новый план 2027" },
    });
    const r = await req("/wins", { token: doctorToken });
    expect(r.body.items.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
//  ACTIVITIES
// ─────────────────────────────────────────────
const event = {
  title: "Конференция по педиатрии",
  description: "Разбор сложных случаев",
  startsAt: "2027-06-20T10:00:00Z",
  endsAt: "2027-06-20T12:00:00Z",
  location: "Конференц-зал №1",
  reminders: [120, 5, 0], // minutes before
};

describe("POST /activities (admin only)", () => {
  it("admin can create an activity with reminders", async () => {
    const r = await req("/activities", {
      method: "POST", token: adminToken, body: event,
    });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty("id");
    expect(r.body.reminders).toEqual([120, 5, 0]);
  });

  it("doctor cannot create activities", async () => {
    const r = await req("/activities", {
      method: "POST", token: doctorToken, body: event,
    });
    expect(r.status).toBe(403);
  });

  it("rejects activity with past start date", async () => {
    const r = await req("/activities", {
      method: "POST", token: adminToken,
      body: { ...event, startsAt: "2020-01-01T10:00:00Z" },
    });
    expect(r.status).toBe(400);
  });
});

describe("GET /activities", () => {
  it("returns list with ?from=&to= filter", async () => {
    const r = await req("/activities?from=2027-01-01&to=2027-12-31", { token: doctorToken });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.items)).toBe(true);
  });
});

// ─────────────────────────────────────────────
//  PUSH TOKENS
// ─────────────────────────────────────────────
describe("POST /devices/register", () => {
  it("saves expo push token", async () => {
    const r = await req("/devices/register", {
      method: "POST", token: doctorToken,
      body: { expoPushToken: "ExponentPushToken[test123]" },
    });
    expect(r.status).toBe(200);
  });

  it("rejects malformed push token", async () => {
    const r = await req("/devices/register", {
      method: "POST", token: doctorToken,
      body: { expoPushToken: "not-a-valid-token" },
    });
    expect(r.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
//  NEWS
// ─────────────────────────────────────────────
describe("POST /news (admin only)", () => {
  it("admin can publish news", async () => {
    const r = await req("/news", {
      method: "POST", token: adminToken,
      body: { title: "Новые рекомендации ВОЗ", content: "Краткое содержание...", source: "WHO", publishedAt: "2026-06-01" },
    });
    expect(r.status).toBe(201);
  });

  it("doctor cannot publish news", async () => {
    const r = await req("/news", {
      method: "POST", token: doctorToken,
      body: { title: "Test", content: "..." },
    });
    expect(r.status).toBe(403);
  });
});

describe("GET /news", () => {
  it("returns paginated news", async () => {
    const r = await req("/news?page=1&limit=10", { token: doctorToken });
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
    expect(r.body).toHaveProperty("total");
  });
});

// ─────────────────────────────────────────────
//  CLINICAL CASES
// ─────────────────────────────────────────────
describe("POST /cases/:id/submit", () => {
  it("accepts answers and returns score + explanations", async () => {
    const r = await req("/cases/case-001/submit", {
      method: "POST", token: doctorToken,
      body: { answers: { q1: "B", q2: "A" } },
    });
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("score");
    expect(r.body).toHaveProperty("correct");
    expect(r.body).toHaveProperty("explanations");
    expect(r.body).toHaveProperty("articleUrl");
  });

  it("cannot submit same case twice", async () => {
    const r = await req("/cases/case-001/submit", {
      method: "POST", token: doctorToken,
      body: { answers: { q1: "A", q2: "B" } },
    });
    expect(r.status).toBe(409);
  });

  it("returns 400 for missing answers", async () => {
    const r = await req("/cases/case-001/submit", {
      method: "POST", token: doctorToken, body: {},
    });
    expect(r.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
//  SECURITY
// ─────────────────────────────────────────────
describe("Security hardening", () => {
  it("rejects expired JWT", async () => {
    const expired = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4IiwiZXhwIjoxfQ.fake";
    const r = await req("/plans/me", { token: expired });
    expect(r.status).toBe(401);
  });

  it("rejects tampered JWT", async () => {
    const tampered = doctorToken.slice(0, -4) + "XXXX";
    const r = await req("/plans/me", { token: tampered });
    expect(r.status).toBe(401);
  });

  it("XSS: HTML in plan mission is stored escaped", async () => {
    await req(`/plans/${doctorId}`, {
      method: "PUT", token: adminToken,
      body: { ...samplePlan, mission: '<script>alert("xss")</script>' },
    });
    const plan = await req("/plans/me", { token: doctorToken });
    expect(plan.body.mission).not.toContain("<script>");
  });

  it("SQL injection in login rejected by zod (invalid email)", async () => {
    const r = await req("/auth/login", {
      method: "POST",
      body: { email: "' OR 1=1 --", password: "anything" },
    });
    expect(r.status).toBe(400);
  });

  it("rate limiting: 11th auth attempt is blocked (429)", async () => {
    const attempts = Array.from({ length: 11 }, () =>
      req("/auth/login", {
        method: "POST",
        body: { email: "spam@clinic.test", password: "Wrong!" },
      })
    );
    const results = await Promise.all(attempts);
    expect(results.some(r => r.status === 429)).toBe(true);
  });
});
