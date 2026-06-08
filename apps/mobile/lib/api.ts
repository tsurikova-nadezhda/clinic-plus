/**
 * API-клиент. Только типы тянем из @clinic-plus/shared (import type —
 * стирается при сборке, Metro не бандлит TS-пакет).
 *
 * Base URL: EXPO_PUBLIC_API_URL или extra.apiUrl из app.json.
 */
import Constants from "expo-constants";
import type { Plan, ArchiveYear } from "@clinic-plus/shared";

const BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:3001";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

let authToken: string | null = null;
export function setApiToken(t: string | null) {
  authToken = t;
}

// Колбэк при 401 (недействительный/просроченный токен) → разлогин в auth.tsx.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false && authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(BASE + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (res.status === 401 && opts.auth !== false) {
    onUnauthorized?.(); // токен недействителен → разлогин и редирект на вход
  }
  if (!res.ok) {
    throw new ApiError(res.status, (json && json.error) || `HTTP ${res.status}`);
  }
  return json as T;
}

// ── Типы ответов, которых нет в shared ──
export interface Win { id: string; text: string; category: string; createdAt: string }
export interface Activity {
  id: string; title: string; description?: string; startsAt: string; endsAt: string;
  location?: string; reminders: number[];
}
export interface NewsItem { id: string; title: string; content: string; source?: string; publishedAt: string }
export interface CaseQuestion {
  id: string; text: string; options: { key: string; label: string }[];
}
export interface ClinicalCase {
  id: string; title: string; specialty?: string; scenario: string;
  questions: CaseQuestion[]; articleUrl?: string; articleText?: string;
}
export interface CaseResult {
  score: number;
  correct: Record<string, boolean>;
  explanations: Record<string, string>;
  articleUrl: string | null;
}

function qs(params: Record<string, string | undefined>): string {
  const e = Object.entries(params).filter(([, v]) => v != null && v !== "");
  return e.length ? "?" + e.map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join("&") : "";
}

export const api = {
  setToken: setApiToken,

  // auth
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  register: (email: string, password: string, name: string) =>
    request<{ token: string; userId: string }>("/auth/register", { method: "POST", body: { email, password, name }, auth: false }),

  // план / профиль
  planMe: () => request<Plan>("/plans/me"),
  archive: () => request<{ years: ArchiveYear[] }>("/plans/me/archive"),
  patchTask: (taskId: string, status: "pending" | "in_progress" | "done") =>
    request<{ status: string }>(`/plans/me/tasks/${taskId}`, { method: "PATCH", body: { status } }),
  putBalance: (year: number, phase: "start" | "end", values: number[]) =>
    request(`/balance/${year}/${phase}`, { method: "PUT", body: { values } }),
  putReflection: (year: number, scope: "Q1" | "Q2" | "Q3" | "Q4" | "year", text: string) =>
    request(`/reflections/${year}/${scope}`, { method: "PUT", body: { text } }),

  // дневник успеха
  wins: () => request<{ items: Win[] }>("/wins"),
  addWin: (text: string, category: string) =>
    request<Win>("/wins", { method: "POST", body: { text, category } }),

  // активности / новости / кейсы
  activities: (from?: string, to?: string) =>
    request<{ items: Activity[] }>("/activities" + qs({ from, to })),
  news: (page = 1, limit = 20) =>
    request<{ items: NewsItem[]; total: number }>(`/news?page=${page}&limit=${limit}`),
  cases: () => request<{ items: ClinicalCase[] }>("/cases"),
  submitCase: (id: string, answers: Record<string, string>) =>
    request<CaseResult>(`/cases/${id}/submit`, { method: "POST", body: { answers } }),

  // push
  registerDevice: (expoPushToken: string) =>
    request("/devices/register", { method: "POST", body: { expoPushToken } }),
};
