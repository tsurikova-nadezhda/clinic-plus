import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon, Line, Text as SvgText } from "react-native-svg";
import { colors } from "../lib/theme";

const LABELS = ["Карьера", "Здоровье", "Семья", "Друзья", "Рост", "Финансы", "Отдых", "Дух"];

/**
 * Колесо баланса (радар): сравнение «начало года» vs «конец года».
 * 8 сфер, значения 0..10. Пунктир plum — начало, заливка orange — конец.
 */
export function BalanceWheel({
  start,
  end,
  labels = LABELS,
}: { start: number[]; end: number[]; labels?: string[] }) {
  const size = 240, cx = 120, cy = 120, R = 80, n = labels.length;
  const pt = (v: number, i: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = (R * v) / 10;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(v, i).join(",")).join(" ");

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[2, 4, 6, 8, 10].map((r) => (
          <Polygon
            key={r}
            points={labels.map((_, i) => pt(r, i).join(",")).join(" ")}
            fill="none"
            stroke="rgba(82,62,122,0.10)"
            strokeWidth={1}
          />
        ))}
        {labels.map((_, i) => {
          const [x, y] = pt(10, i);
          return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(82,62,122,0.10)" strokeWidth={1} />;
        })}
        <Polygon points={poly(start)} fill={colors.plum} fillOpacity={0.12} stroke={colors.plum} strokeWidth={1.5} strokeDasharray="4 3" />
        <Polygon points={poly(end)} fill={colors.orange} fillOpacity={0.15} stroke={colors.orange} strokeWidth={2} />
        {labels.map((l, i) => {
          const [x, y] = pt(12.5, i);
          return (
            <SvgText key={i} x={x} y={y} fontSize={9} fill={colors.muted} textAnchor="middle">
              {l}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dash, { borderColor: colors.plum }]} />
          <Text style={styles.legendText}>Начало года</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.solid, { backgroundColor: colors.orange }]} />
          <Text style={styles.legendText}>Конец года</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", gap: 16, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dash: { width: 16, height: 0, borderTopWidth: 2, borderStyle: "dashed" },
  solid: { width: 16, height: 4, borderRadius: 2 },
  legendText: { fontSize: 12, color: colors.muted },
});
