import { Image } from "react-native";

// Настоящий логотип клиники (детская клиника ПЛЮС), соотношение 338:86.
const LOGO = require("../assets/logo.png");
const RATIO = 338 / 86;

/**
 * Логотип «детская клиника ПЛЮС» — реальный фирменный знак (SPEC §4).
 * size задаёт высоту; ширина считается по пропорции.
 */
export function Logo({ size = 30 }: { size?: number; compact?: boolean; onPlum?: boolean }) {
  const h = Math.round(size * 1.25);
  const w = Math.round(h * RATIO);
  return <Image source={LOGO} style={{ width: w, height: h }} resizeMode="contain" />;
}
