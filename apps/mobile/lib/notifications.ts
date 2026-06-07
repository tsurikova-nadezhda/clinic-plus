/**
 * Push-уведомления (SPEC §6.2).
 *
 * Мобайл: запрашивает разрешение, получает Expo push-токен и регистрирует его
 * на бэкенде (/devices/register). Само расписание напоминаний
 * (за 2 часа / за 5 минут / в момент начала) рассылает серверный планировщик
 * по deviceTokens — здесь мы только сохраняем токен и настройки врача.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PREFS_KEY = "clinicplus.reminderPrefs";

/** Какие напоминания о мероприятиях получать (минуты до начала). */
export interface ReminderPrefs {
  twoHours: boolean; // 120
  fiveMin: boolean;  // 5
  atStart: boolean;  // 0
}
export const defaultReminderPrefs: ReminderPrefs = { twoHours: true, fiveMin: true, atStart: true };

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  const raw = await AsyncStorage.getItem(PREFS_KEY);
  return raw ? { ...defaultReminderPrefs, ...JSON.parse(raw) } : defaultReminderPrefs;
}
export async function saveReminderPrefs(p: ReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

/** Преобразует настройки в массив минут для сервера (напр. [120, 5, 0]). */
export function prefsToMinutes(p: ReminderPrefs): number[] {
  const out: number[] = [];
  if (p.twoHours) out.push(120);
  if (p.fiveMin) out.push(5);
  if (p.atStart) out.push(0);
  return out;
}

/**
 * Запрашивает разрешение, получает Expo push-токен и регистрирует на сервере.
 * Возвращает токен или null (эмулятор / отказ / web).
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null; // на симуляторе push недоступен

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Мероприятия",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#FF5100",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  // В Expo Go (без projectId / dev-сборки) getExpoPushTokenAsync может бросить —
  // глушим, чтобы UI не падал. Push работает в preview/production-сборке.
  try {
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResp.data;
    try {
      await api.registerDevice(token);
    } catch {
      // токен получим заново при следующем запуске
    }
    return token;
  } catch {
    return null; // push недоступен в текущем окружении (напр. Expo Go)
  }
}
