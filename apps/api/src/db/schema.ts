/**
 * Drizzle ORM schema — PostgreSQL
 *
 * ВАЖНО: plans используют составной PK (userId, year)
 * чтобы хранить планы за все годы (архив) без удаления.
 *
 * Постоянный профиль врача (никогда не стирается):
 *   - successWins    — дневник успеха
 *   - balanceWheels  — колёса баланса по годам
 *   - reflections    — рефлексии (квартальные + годовые)
 */

import {
  pgTable, text, timestamp, jsonb, integer,
  uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ─────────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id:           text("id").primaryKey().$defaultFn(() => createId()),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name:         text("name").notNull(),
  role:         text("role", { enum: ["doctor", "admin"] }).notNull().default("doctor"),
  specialty:    text("specialty"),
  avatarUrl:    text("avatar_url"),
  createdAt:    timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  PLANS  — составной PK (userId + year)
//  При загрузке нового плана старый НЕ удаляется.
//  Запрос плана конкретного года: WHERE userId=X AND year=Y
// ─────────────────────────────────────────────
export const plans = pgTable("plans", {
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year:      integer("year").notNull(),
  data: jsonb("data").notNull().$type<{
    year: number;
    mission: string;
    achievements?: string[];      // краткий список для архивного отображения
    quarters: Array<{
      q: "Q1" | "Q2" | "Q3" | "Q4";
      title: string;
      focus: string;
      tasks: Array<{
        id: string;
        type: "course" | "book" | "media" | "practice";
        text: string;
        status: "pending" | "in_progress" | "done";
        link?: string;
        tag?: "ru" | "en";
        note?: string;
      }>;
    }>;
  }>(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.year] }),
}));

// ─────────────────────────────────────────────
//  BALANCE WHEELS  — колёса баланса по годам
//  phase: "start" = начало года, "end" = конец года
//  values: 8 чисел от 0 до 10 (8 сфер жизни)
// ─────────────────────────────────────────────
export const balanceWheels = pgTable("balance_wheels", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year:      integer("year").notNull(),
  phase:     text("phase", { enum: ["start", "end"] }).notNull(),
  values:    jsonb("values").notNull().$type<number[]>(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("bw_user_year_phase_idx").on(t.userId, t.year, t.phase),
}));

// ─────────────────────────────────────────────
//  REFLECTIONS  — рефлексии, хранятся вечно
//  scope: Q1/Q2/Q3/Q4 = квартальные, "year" = итог года
// ─────────────────────────────────────────────
export const reflections = pgTable("reflections", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year:      integer("year").notNull(),
  scope:     text("scope", { enum: ["Q1", "Q2", "Q3", "Q4", "year"] }).notNull(),
  text:      text("text").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("ref_user_year_scope_idx").on(t.userId, t.year, t.scope),
}));

// ─────────────────────────────────────────────
//  SUCCESS WINS  — дневник успеха (append-only)
//  Никогда не удаляется при обновлении плана.
// ─────────────────────────────────────────────
export const successWins = pgTable("success_wins", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text:      text("text").notNull(),
  category:  text("category", { enum: ["Профессия", "Блог", "Личное", "Обучение"] }).notNull().default("Профессия"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  ACTIVITIES  — мероприятия
//  reminders: массив минут до начала (напр. [120, 5, 0])
// ─────────────────────────────────────────────
export const activities = pgTable("activities", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  title:       text("title").notNull(),
  description: text("description"),
  startsAt:    timestamp("starts_at").notNull(),
  endsAt:      timestamp("ends_at").notNull(),
  location:    text("location"),
  imageUrl:    text("image_url"),
  reminders:   jsonb("reminders").$type<number[]>().default([120, 5, 0]),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  DEVICE TOKENS  — для push-уведомлений (Expo)
// ─────────────────────────────────────────────
export const deviceTokens = pgTable("device_tokens", {
  id:        text("id").primaryKey().$defaultFn(() => createId()),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token:     text("token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("device_tokens_token_idx").on(t.token),
}));

// ─────────────────────────────────────────────
//  NEWS
// ─────────────────────────────────────────────
export const news = pgTable("news", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  title:       text("title").notNull(),
  content:     text("content").notNull(),
  source:      text("source"),
  imageUrl:    text("image_url"),
  publishedAt: timestamp("published_at").notNull(),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  CLINICAL CASES
// ─────────────────────────────────────────────
export const cases = pgTable("cases", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  title:       text("title").notNull(),
  specialty:   text("specialty"),
  scenario:    text("scenario").notNull(),
  questions: jsonb("questions").notNull().$type<Array<{
    id: string;
    text: string;
    options: Array<{ key: string; label: string }>;
    correctAnswer: string;
    explanation: string;
  }>>(),
  articleUrl:  text("article_url"),
  articleText: text("article_text"),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ─────────────────────────────────────────────
//  SENT REMINDERS  — журнал отправленных push (§6.2)
//  Идемпотентность cron: одно напоминание (activityId + minutesBefore)
//  рассылается ровно один раз. Уникальный индекс гарантирует отсутствие дублей.
// ─────────────────────────────────────────────
export const sentReminders = pgTable("sent_reminders", {
  id:            text("id").primaryKey().$defaultFn(() => createId()),
  activityId:    text("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  minutesBefore: integer("minutes_before").notNull(),
  sentAt:        timestamp("sent_at").defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("sent_reminders_activity_min_idx").on(t.activityId, t.minutesBefore),
}));

export const caseSubmissions = pgTable("case_submissions", {
  id:          text("id").primaryKey().$defaultFn(() => createId()),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  caseId:      text("case_id").notNull().references(() => cases.id),
  answers:     jsonb("answers").notNull().$type<Record<string, string>>(),
  score:       integer("score").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("submissions_user_case_idx").on(t.userId, t.caseId),
}));
