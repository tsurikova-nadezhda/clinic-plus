import { View, Text, StyleSheet } from "react-native";
import { colors, logoLetterColors } from "../lib/theme";

/**
 * Логотип «детская клиника ПЛЮС» (SPEC §4).
 * «детская клиника» — plum; буквы ПЛЮС цветные: П green, Л yellow, Ю+ orange, С blue.
 */
export function Logo({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.kicker, { color: light ? colors.yellow : colors.plum }]}>
        детская клиника
      </Text>
      <View style={styles.row}>
        <Letter ch="П" size={size} />
        <Letter ch="Л" size={size} />
        <Letter ch="Ю" size={size} />
        <Letter ch="+" size={size} />
        <Letter ch="С" size={size} />
      </View>
    </View>
  );
}

function Letter({ ch, size }: { ch: keyof typeof logoLetterColors; size: number }) {
  return (
    <Text style={{ color: logoLetterColors[ch], fontSize: size, fontWeight: "900", letterSpacing: 1 }}>
      {ch}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start" },
  kicker: { fontSize: 11, fontWeight: "600", textTransform: "lowercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center" },
});
