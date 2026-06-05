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

let timer: ReturnType<typeof setInterval> | null = null;

/** Запускает минутный цикл рассылки. Безопасно вызывать один раз при старте сервера. */
export function startScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    dispatchDueReminders().catch((e) => console.error("[push] cron error:", e));
  }, MINUTE);
  console.log("⏰ Push-планировщик запущен (каждые 60 c)");
}

export function stopScheduler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
