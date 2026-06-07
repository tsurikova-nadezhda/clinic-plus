import { View, Text, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

/**
 * Логотип «детская клиника ПЛЮС» (SPEC §4).
 * Оригинальный знак: скруглённый бейдж с медицинским крестом (вместо
 * некорректного инлайн-«+»). Слово ПЛЮС — фирменные цвета букв:
 * П green, Л yellow, Ю orange, С blue.
 * Официальный логотип клиники можно позже подставить картинкой.
 */
export function Logo({
  size = 30,
  compact = false,
  onPlum = false,
}: { size?: number; compact?: boolean; onPlum?: boolean }) {
  const badge = Math.round(size * 1.15);
  const barLen = Math.round(badge * 0.5);
  const barThick = Math.max(3, Math.round(badge * 0.16));
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { width: badge, height: badge, borderRadius: badge * 0.32 }]}>
        {/* медицинский крест из двух скруглённых полос */}
        <View style={{ position: "absolute", width: barLen, height: barThick, borderRadius: barThick, backgroundColor: colors.white }} />
        <View style={{ position: "absolute", width: barThick, height: barLen, borderRadius: barThick, backgroundColor: colors.white }} />
      </View>
      <View>
        {!compact && (
          <Text style={[styles.kicker, { color: onPlum ? colors.yellow : colors.plum }]}>
            детская клиника
          </Text>
        )}
        <View style={styles.word}>
          {([["П", colors.green], ["Л", colors.yellow], ["Ю", colors.orange], ["С", colors.blue]] as const).map(
            ([ch, col], i) => (
              <Text key={i} style={{ color: col, fontSize: size, fontWeight: "900", letterSpacing: 0.5 }}>
                {ch}
              </Text>
            ),
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  kicker: { fontSize: 10, fontWeight: "700", textTransform: "lowercase", letterSpacing: 0.3, marginBottom: 1 },
  word: { flexDirection: "row", alignItems: "center" },
});
