/**
 * Брендинг — строго из SPEC §4. Не менять значения цветов.
 */
export const colors = {
  plum:     "#523E7A", // основной — шапки, навигация
  plumDeep: "#3b2c5a",
  orange:   "#FF5100", // акцент — кнопки, активные элементы
  yellow:   "#FACA30", // подсветка на тёмном фоне
  white:    "#FFFFFF",
  paper:    "#faf7f2", // фон
  ink:      "#2c2438", // основной текст
  muted:    "#8a7fa3",
  // доп. цвета логотипа
  green:    "#7DA82B",
  blue:     "#7FC4E8",
} as const;

/** Цвета букв логотипа ПЛЮС (§4): П=green, Л=yellow, Ю+=orange, С=blue. */
export const logoLetterColors = {
  П: colors.green,
  Л: colors.yellow,
  Ю: colors.orange,
  "+": colors.orange,
  С: colors.blue,
} as const;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const typography = {
  h1: { fontSize: 26, fontWeight: "800" as const, color: colors.ink },
  h2: { fontSize: 20, fontWeight: "700" as const, color: colors.ink },
  h3: { fontSize: 16, fontWeight: "700" as const, color: colors.ink },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.ink },
  muted: { fontSize: 13, fontWeight: "400" as const, color: colors.muted },
  onPlum: { fontSize: 15, color: colors.white },
};

/** Тон философии «Правила 50%» — тёплые подписи без давления (§4). */
export const warmCopy = {
  greeting: "Рады видеть вас",
  archiveLow: "Вы двигались в своём темпе — и это уже результат.",
  emptyDiary: "Здесь будут ваши победы — большие и маленькие.",
};
