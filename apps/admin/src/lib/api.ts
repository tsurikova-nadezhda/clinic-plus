/**
 * API-клиент админки. Типы — из @clinic-plus/shared (import type).
 */
import type { Plan, CaseCreate } from "@clinic-plus/shared";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

let token: string | null = null;
export function setApiToken(t: string | null) {
  token = t;
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (json && json.error) || `HTTP ${res.status}`);
  return json as T;
}

// ── типы ответов ──
export interface DoctorRow {
  id: string; name: string; email: string; specialty: string | null;
  year: number; hasPlan: boolean; total: number; done: number; pct: number;
}
export interface SubmissionRow {
  id: string; userId: string; userName: string; caseId: string; caseTitle: string;
  score: number; total: number; submittedAt: string;
}
export interface ActivityRow {
  id: string; title: string; description?: string; startsAt: string; endsAt: string;
  location?: string; reminders: number[];
}
export interface NewsRow { id: string; title: string; content: string; source?: string; publishedAt: string }
export interface CaseRow {
  id: string; title: string; specialty?: string; scenario: string;
  questions: { id: string; text: string; correctAnswer: string }[];
}

export const api = {
  setToken: setApiToken,
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", { method: "POST", body: { email, password }, auth: false }),

  // врачи / планы
  doctors: () => request<{ items: DoctorRow[] }>("/admin/doctors"),
  getPlan: (userId: string) => request<Plan>(`/plans/${userId}`),
  putPlan: (userId: string, plan: Plan) =>
    request<{ message: string }>(`/plans/${userId}`, { method: "PUT", body: plan }),

  // мероприятия / новости / кейсы
  activities: () => request<{ items: ActivityRow[] }>("/activities"),
  createActivity: (body: Record<string, unknown>) =>
    request<ActivityRow>("/activities", { method: "POST", body }),
  news: (page = 1, limit = 50) => request<{ items: NewsRow[]; total: number }>(`/news?page=${page}&limit=${limit}`),
  createNews: (body: Record<string, unknown>) => request<NewsRow>("/news", { method: "POST", body }),
  cases: () => request<{ items: CaseRow[] }>("/cases"),
  createCase: (body: CaseCreate) => request<CaseRow>("/cases", { method: "POST", body }),

  // статистика
  submissions: () => request<{ items: SubmissionRow[] }>("/admin/submissions"),
};
