# EAS Build — чеклист (mobile, apps/mobile)

Цель: собрать **preview**-сборку для внутреннего тестирования на телефоне через QR.

Профили в `eas.json`:
- **preview** — Android `.apk` (ставится по QR/ссылке без магазина), iOS — ad-hoc;
- **development** — dev-client;
- **production** — для публикации в сторы.

---

## A. Что уже готово в коде

- `app.json`: `name` «Клиника ПЛЮС», `slug` `clinic-plus`, `scheme` `clinicplus`,
  `ios.bundleIdentifier` = `ru.clinicplus.doctor`, `android.package` = `ru.clinicplus.doctor`,
  `version` `1.0.0`, плагины `expo-router` и `expo-notifications`.
- `eas.json` с профилем `preview`.

## B. Что нужно сделать ВАМ (по порядку)

### 1. Аккаунт и CLI
- [ ] Создать аккаунт на [expo.dev](https://expo.dev) (бесплатно).
- [ ] Установить CLI и войти:
  ```bash
  npm i -g eas-cli
  eas login
  ```

### 2. Привязать проект (создаст projectId)
- [ ] Из `apps/mobile`:
  ```bash
  cd apps/mobile
  eas init
  ```
  Это запишет в `app.json` → `extra.eas.projectId` и `owner`.
  **Важно:** этот `projectId` нужен для push-токенов (`lib/notifications.ts` его читает).

### 3. Иконка и splash (рекомендуется до сборки)
- [ ] Подготовить **иконку 1024×1024 PNG** (без прозрачности) и положить в
  `apps/mobile/assets/icon.png`. Логотип ПЛЮС: П `#7DA82B`, Л `#FACA30`,
  Ю+ `#FF5100`, С `#7FC4E8` на фоне `#523E7A` (§4).
- [ ] (Android) `adaptive-icon.png` 1024×1024, foreground.
- [ ] Добавить в `app.json` → `expo`:
  ```json
  "icon": "./assets/icon.png",
  "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#523E7A" },
  "android": {
    "package": "ru.clinicplus.doctor",
    "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#523E7A" }
  }
  ```
  > Без иконки сборка тоже пройдёт (Expo подставит дефолтную) — это можно сделать позже.

### 4. Указать адрес боевого backend
- [ ] Перед сборкой задать `EXPO_PUBLIC_API_URL` (или `extra.apiUrl` в `app.json`)
  на адрес задеплоенного API (см. `docs/DEPLOY.md`). Пример:
  ```bash
  EXPO_PUBLIC_API_URL=https://clinic-plus-api.up.railway.app eas build -p android --profile preview
  ```

### 5. Сборка preview
- [ ] **Android (самый быстрый путь, без платных аккаунтов):**
  ```bash
  eas build -p android --profile preview
  ```
  По завершении EAS даст ссылку и QR — откройте на телефоне, скачайте `.apk`, установите.
- [ ] **iOS (нужен Apple Developer):**
  ```bash
  eas device:create        # зарегистрировать UDID телефона
  eas build -p ios --profile preview
  ```

---

## C. Платные аккаунты — когда нужны

| Что | Стоимость | Когда обязательно |
|-----|-----------|-------------------|
| **Expo (EAS)** | бесплатно | сразу (сборка, push) |
| **Google Play Developer** | $25 разово | только для публикации в Play. Для теста по QR (`.apk`) **не нужен** |
| **Apple Developer** | $99 / год | для ЛЮБОЙ установки на iPhone (даже preview/TestFlight) |

> Быстрее всего проверить на **Android по QR** — Apple/Google аккаунты не требуются.
> Для iPhone-теста сначала оформите Apple Developer.

## D. Push-уведомления на реальной сборке
- [ ] `eas init` выполнен (есть `projectId`) — без него `getExpoPushTokenAsync` не выдаст токен.
- [ ] Android: FCM-креды EAS создаст автоматически при первой сборке.
- [ ] iOS: APNs-ключ EAS сгенерирует при сборке (нужен Apple Developer).
- [ ] Проверка: войти в приложение → разрешить уведомления → токен уйдёт в
  `POST /devices/register`; серверный cron (`§6.2`) разошлёт push по расписанию мероприятий.

## E. Дальше — публикация (когда будете готовы)
- [ ] `eas build -p android --profile production` + `eas submit -p android` (Play).
- [ ] `eas build -p ios --profile production` + `eas submit -p ios` (App Store/TestFlight).
