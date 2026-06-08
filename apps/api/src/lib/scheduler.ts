/**
 * Серверный планировщик push-напоминаний (SPEC §6.2).
 *
 * Каждую минуту проверяет мероприятия и рассылает push по deviceTokens
 * за reminders[] минут до начала (напр. [120, 5, 0] = за 2 ч, за 5 мин, в начале).
 *
 * Идемпотентность: каждое (activityId, minutesBefore) рассылается ровно один раз —
 * запись резервируется в sentReminders ДО отправки, повторный вызов её пропускает.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendExpoPush, reminderLabel, type ExpoMessage } from "./push";

const MINUTE = 60_000;

type SendFn = (messages: ExpoMessage[]) => Promise<void>;

/**
 * Рассылает все «созревшие» напоминания на момент `now`.
 * Возвращает число фактически разосланных напоминаний (новых, не дублей).
 * `send` инъектируется в тестах (по умолчанию — реальный Expo Push API).
 */
export async function dispatchDueReminders(now: Date = new Date(), send: SendFn = sendExpoPush): Promise<number> {
  const nowMs = now.getTime();
  const [activities, tokens] = await Promise.all([
    db.query.activities.findMany(),
    db.query.deviceTokens.findMany(),
  ]);

  let dispatched = 0;

  for (const a of activities as any[]) {
    const startMs = new Date(a.startsAt).getTime();
    // не рассматриваем уже прошедшие мероприятия (с минутным грейсом на «в начале»)
    if (nowMs >= startMs + MINUTE) continue;

    for (const min of (a.reminders ?? []) as number[]) {
      const sendAt = startMs - min * MINUTE;
      if (sendAt > nowMs) continue; // ещё не время

      // Идемпотентность: пробуем зарезервировать (activityId, minutesBefore).
      const already = await db.query.sentReminders.findFirst({
        where: and(
          eq(schema.sentReminders.activityId, a.id),
          eq(schema.sentReminders.minutesBefore, min),
        ),
      });
      if (already) continue;

      await db.insert(schema.sentReminders)
        .values({ activityId: a.id, minutesBefore: min, sentAt: new Date(nowMs) })
        .onConflictDoNothing();

      if (tokens.length > 0) {
        const messages: ExpoMessage[] = (tokens as any[]).map((t) => ({
          to: t.token,
          title: a.title,
          body: min === 0 ? `Начинается: ${a.title}` : `Скоро (${reminderLabel(min)}): ${a.title}`,
          data: { activityId: a.id, minutesBefore: min },
          sound: "default",
        }));
        await send(messages);
      }
      dispatched++;
    }
  }
  return dispatched;
}

// ─────────────────────────────────────────────
//  Плановые push: мотивация (раз в 2 дня) + рефлексия (25 числа).
//  Время отправки — 06:00 UTC (09:00 МСК). Идемпотентность — daily_push_log.
// ─────────────────────────────────────────────
const PUSH_HOUR_UTC = 6;

// Тёплые мотивирующие фразы в тоне «Правила 50%» (SPEC §4).
const MOTIVATION = [
  "Загляните в свой план года — даже маленький шаг сегодня приближает к мечте 🌱",
  "Маленькие, но регулярные шаги творят чудеса. Сверьтесь с планом — что отметить?",
  "Правило 50%: половина плана — это уже грандиозный успех. Вы молодец 💛",
  "Минута на план года: что из задуманного хочется сделать на этой неделе?",
  "Разрешите себе быть неидеальной. Один шаг к цели сегодня — этого достаточно.",
  "Ваш путь развития ждёт вас. Откройте «Мой путь» и отметьте прогресс ✨",
  "Гармония профессионализма и внутренней свободы рождается из маленьких шагов.",
  "Что хорошего получилось на этой неделе? Запишите это в Дневник успеха 🏆",
];
const REFLECTION_MSG =
  "Конец месяца — время рефлексии. Откройте «Мой путь» и запишите свои инсайты и достижения за месяц ✍️";

async function sendOnce(kind: string, dayKey: string, title: string, body: string, tokens: any[], send: SendFn): Promise<boolean> {
  const exists = await db.query.dailyPushLog.findFirst({
    where: and(eq(schema.dailyPushLog.kind, kind), eq(schema.dailyPushLog.dayKey, dayKey)),
  });
  if (exists) return false;
  await db.insert(schema.dailyPushLog).values({ kind, dayKey }).onConflictDoNothing();
  if (tokens.length > 0) {
    await send(tokens.map((t) => ({ to: t.token, title, body, sound: "default" as const })));
  }
  return true;
}

/**
 * Плановые push на момент `now`. Шлёт только в окно PUSH_HOUR_UTC и не чаще
 * раза в день на каждый вид. Возвращает число разосланных видов (0..2).
 */
export async function dispatchDailyPush(now: Date = new Date(), send: SendFn = sendExpoPush): Promise<number> {
  if (now.getUTCHours() !== PUSH_HOUR_UTC) return 0;
  const dayKey = now.toISOString().slice(0, 10);
  const tokens = await db.query.deviceTokens.findMany();
  let sent = 0;
  // мотивация — 2 числа каждого месяца
  if (now.getUTCDate() === 2) {
    const msg = MOTIVATION[now.getUTCMonth() % MOTIVATION.length];
    if (await sendOnce("motivation", dayKey, "Клиника ПЛЮС", msg, tokens as any[], send)) sent++;
  }
  // рефлексия — 25 числа каждого месяца
  if (now.getUTCDate() === 25) {
    if (await sendOnce("reflection", dayKey, "Рефлексия месяца", REFLECTION_MSG, tokens as any[], send)) sent++;
  }
  return sent;
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Запускает минутный цикл рассылки. Безопасно вызывать один раз при старте сервера. */
export function startScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    dispatchDueReminders().catch((e) => console.error("[push] cron error:", e));
    dispatchDailyPush().catch((e) => console.error("[push] daily error:", e));
  }, MINUTE);
  console.log("⏰ Push-планировщик запущен (мероприятия + мотивация/рефлексия)");
}

export function stopScheduler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
