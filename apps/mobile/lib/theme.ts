/**
 * Брендинг — строго из SPEC §4 (значения цветов не менять).
 * Совпадает с палитрой прототипа.
 */
export const colors = {
  plum:     "#523E7A",
  plumDeep: "#3b2c5a",
  orange:   "#FF5100",
  orange2:  "#ff7a3d", // светлый край оранжевого градиента
  yellow:   "#FACA30",
  white:    "#FFFFFF",
  paper:    "#faf7f2",
  ink:      "#2c2438",
  muted:    "#8a7fa3",
  line:     "rgba(82,62,122,0.14)",
  green:    "#7DA82B",
  greenDeep:"#2e7d4f",
  blue:     "#7FC4E8",
} as const;

// Градиенты для expo-linear-gradient (135° = start {0,0} → end {1,1})
export const gradients = {
  plum:     [colors.plum, colors.plumDeep] as [string, string],
  orange:   [colors.orange, colors.orange2] as [string, string],
  progress: [colors.plum, colors.orange] as [string, string],
};
export const diag = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
export const horiz = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };

// Полупрозрачные заливки (как в прототипе)
export const tint = {
  plum08:   "rgba(82,62,122,0.05)",
  plum10:   "rgba(82,62,122,0.10)",
  plum12:   "rgba(82,62,122,0.12)",
  yellow12: "rgba(250,202,48,0.12)",
  yellow15: "rgba(250,202,48,0.15)",
  yellow18: "rgba(250,202,48,0.18)",
  green15:  "rgba(46,160,90,0.15)",
  green05:  "rgba(46,160,90,0.05)",
  green40:  "rgba(46,160,90,0.40)",
  orange06: "rgba(255,81,0,0.06)",
  orange40: "rgba(255,81,0,0.40)",
};

export const radius = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: "800" as const, color: colors.ink },
  h2: { fontSize: 20, fontWeight: "700" as const, color: colors.ink },
  h3: { fontSize: 16, fontWeight: "700" as const, color: colors.ink },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.ink },
  muted: { fontSize: 13, fontWeight: "400" as const, color: colors.muted },
  onPlum: { fontSize: 15, color: colors.white },
};

export const warmCopy = {
  rule50: "Правило 50%: выполнить половину плана — это уже грандиозный успех.",
  homeQuote: "«Маленькие, но регулярные шаги творят чудеса»",
  emptyDiary: "Здесь будут ваши победы — большие и маленькие.",
  archiveLow: "Хорошее начало пути — каждый шаг засчитан.",
};
