/**
 * @clinic-plus/shared — единый источник правды для данных.
 * Доменные zod-схемы и выведённые из них типы.
 * Импортируется backend (apps/api), mobile (apps/mobile) и admin (apps/admin).
 *
 * SPEC §3, §5, §6, §7.
 */
import { z } from "zod";

// ─────────────────────────────────────────────
//  Роли и базовые перечисления
// ─────────────────────────────────────────────
export const roleSchema = z.enum(["doctor", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const taskTypeSchema = z.enum(["course", "book", "media", "practice"]);
export const taskStatusEnum = z.enum(["pending", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const winCategorySchema = z.enum(["Профессия", "Блог", "Личное", "Обучение"]);
export const scopeSchema = z.enum(["Q1", "Q2", "Q3", "Q4", "year"]);
export const quarterSchema = z.enum(["Q1", "Q2", "Q3", "Q4"]);
export const phaseSchema = z.enum(["start", "end"]);

// ─────────────────────────────────────────────
//  План года (PLAN) — SPEC §5
// ─────────────────────────────────────────────
export const planTaskSchema = z.object({
  id: z.string().min(1),
  type: taskTypeSchema,
  text: z.string().min(1),
  status: taskStatusEnum.default("pending"),
  link: z.string().url().optional(),
  tag: z.enum(["ru", "en"]).optional(),
  note: z.string().optional(),
});
export type Task = z.infer<typeof planTaskSchema>;

export const planQuarterSchema = z.object({
  q: quarterSchema,
  title: z.string().min(1),
  focus: z.string(),
  tasks: z.array(planTaskSchema),
});
export type Quarter = z.infer<typeof planQuarterSchema>;

export const planSchema = z.object({
  year: z.number().int().min(2024).max(2040),
  mission: z.string().min(5),
  achievements: z.array(z.string()).optional(),
  quarters: z.array(planQuarterSchema),
});
export type Plan = z.infer<typeof planSchema>;

// ─────────────────────────────────────────────
//  Колесо баланса / Рефлексии / Дневник успеха
// ─────────────────────────────────────────────
export const balanceWheelSchema = z.object({
  values: z.array(z.number().min(0).max(10)).length(8, "Must have exactly 8 values"),
});
export type BalanceWheel = z.infer<typeof balanceWheelSchema>;

export const reflectionInputSchema = z.object({
  text: z.string().min(1),
});

export const winInputSchema = z.object({
  text: z.string().min(1),
  category: winCategorySchema.default("Профессия"),
});

// ─────────────────────────────────────────────
//  Мероприятия (ACTIVITY) — SPEC §6.2
// ─────────────────────────────────────────────
export const activityInputSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional(),
  reminders: z.array(z.number().int().min(0)).default([120, 5, 0]),
});
export type ActivityInput = z.infer<typeof activityInputSchema>;

// ─────────────────────────────────────────────
//  Новости (NEWS)
// ─────────────────────────────────────────────
export const newsInputSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  source: z.string().optional(),
  imageUrl: z.string().url().optional(),
  publishedAt: z.string(),
});
export type NewsInput = z.infer<typeof newsInputSchema>;

// ─────────────────────────────────────────────
//  Клинический случай (CASE) — SPEC §6.4
// ─────────────────────────────────────────────
export const caseQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.array(z.object({ key: z.string(), label: z.string() })),
  correctAnswer: z.string(),
  explanation: z.string(),
});
export type CaseQuestion = z.infer<typeof caseQuestionSchema>;

export const caseSubmitSchema = z.object({
  answers: z
    .record(z.string(), z.string())
    .refine((a) => Object.keys(a).length > 0, "answers required"),
});
export type CaseSubmit = z.infer<typeof caseSubmitSchema>;

// ─────────────────────────────────────────────
//  Push-токен (Expo)
// ─────────────────────────────────────────────
export const pushTokenSchema = z.object({
  expoPushToken: z
    .string()
    .regex(/^ExponentPushToken\[.+\]$/, "Invalid Expo push token format"),
});

// ─────────────────────────────────────────────
//  Статус задачи (PATCH)
// ─────────────────────────────────────────────
export const taskStatusSchema = z.object({
  status: taskStatusEnum,
});

// ─────────────────────────────────────────────
//  Бизнес-правило §6.1 — позитивная подача архива
//  ≥60% → показываем процент; <60% → процент НЕ показываем.
// ─────────────────────────────────────────────
export const ARCHIVE_PERCENTAGE_THRESHOLD = 60;

export interface ArchiveYear {
  year: number;
  mission: string;
  showPercentage: boolean;
  percentage?: number;
  achievements: string[];
}

/** Считает прогресс плана и применяет правило §6.1. */
export function buildArchiveYear(year: number, data: Plan): ArchiveYear {
  const allTasks = data.quarters?.flatMap((q) => q.tasks) ?? [];
  const total = allTasks.length;
  const done = allTasks.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const show = pct >= ARCHIVE_PERCENTAGE_THRESHOLD;
  return {
    year,
    mission: data.mission,
    showPercentage: show,
    percentage: show ? pct : undefined,
    achievements: data.achievements ?? [],
  };
}
