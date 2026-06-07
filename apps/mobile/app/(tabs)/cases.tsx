import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Loading, Empty } from "../../components/ui";
import { api, type ClinicalCase } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { colors, gradients, diag, radius, space } from "../../lib/theme";

export default function CasesScreen() {
  const router = useRouter();
  const { data, loading, refreshing, refresh } = useAsync<{ items: ClinicalCase[] }>(() => api.cases());
  if (loading) return <Loading />;
  const items = data?.items ?? [];

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Text style={styles.h1}>Случай из практики</Text>
      <Text style={styles.sub}>Решите задачу, проверьте себя, изучите разбор</Text>

      {items.length === 0 ? <Empty text="Новых случаев пока нет." /> : items.map((c, i) =>
        i === 0 ? (
          <Pressable key={c.id} onPress={() => router.push(`/case/${c.id}`)}>
            <LinearGradient colors={gradients.orange} start={diag.start} end={diag.end} style={styles.feature}>
              <View style={styles.featTag}><Text style={styles.featTagText}>НОВЫЙ</Text></View>
              <Text style={styles.featTitle}>{c.title}</Text>
              <Text style={styles.featMeta}>{c.specialty ? `${c.specialty} · ` : ""}{c.questions.length} {plural(c.questions.length, "вопрос", "вопроса", "вопросов")} · ~5 мин</Text>
              <View style={styles.featCta}><Text style={styles.featCtaText}>Начать</Text><Ionicons name="chevron-forward" size={16} color={colors.white} /></View>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable key={c.id} onPress={() => router.push(`/case/${c.id}`)} style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardMeta}>{c.specialty ? `${c.specialty} · ` : ""}{c.questions.length} {plural(c.questions.length, "вопрос", "вопроса", "вопросов")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </View>
          </Pressable>
        ),
      )}
    </Screen>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const d = n % 10, dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return few;
  return many;
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: colors.plumDeep },
  sub: { fontSize: 14, color: colors.muted, marginBottom: space.sm },
  feature: { borderRadius: radius.xl, padding: space.lg, gap: 6 },
  featTag: { alignSelf: "flex-start", backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  featTagText: { fontSize: 10, fontWeight: "800", color: colors.orange },
  featTitle: { color: colors.white, fontSize: 18, fontWeight: "800", marginTop: 6, lineHeight: 23 },
  featMeta: { color: colors.white, opacity: 0.9, fontSize: 12 },
  featCta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  featCtaText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: space.lg, borderWidth: 1, borderColor: colors.line },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.plumDeep },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
