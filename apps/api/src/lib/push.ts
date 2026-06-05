/**
 * Expo Push — рассылка системных уведомлений (SPEC §6.2).
 *
 * Для каждого мероприятия расписание напоминаний (минуты до старта),
 * напр. [120, 5, 0] = за 2 часа, за 5 минут, в момент начала.
 * Серверный планировщик рассылает push по deviceTokens.
 *
 * Здесь — низкоуровневый отправитель и расчёт времён. Сам cron-цикл
 * подключается в index.ts при деплое (вне тестового пути).
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface ExpoMessage {
  to: string;            // ExponentPushToken[...]
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
}

/** Отправляет батч сообщений в Expo Push API. */
export async function sendExpoPush(messages: ExpoMessage[]): Promise<void> {
  if (messages.length === 0) return;
  // Expo принимает до 100 сообщений за запрос
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(batch),
    });
  }
}

/**
 * Для события со startsAt и расписанием reminders (минуты до начала)
 * возвращает абсолютные моменты отправки push.
 */
export function reminderTimes(startsAt: Date, reminders: number[]): Date[] {
  return reminders.map((min) => new Date(startsAt.getTime() - min * 60_000));
}

/** Человекочитаемая подпись напоминания. */
export function reminderLabel(min: number): string {
  if (min === 0) return "началось";
  if (min < 60) return `через ${min} мин`;
  const h = Math.round(min / 60);
  return `через ${h} ч`;
}
