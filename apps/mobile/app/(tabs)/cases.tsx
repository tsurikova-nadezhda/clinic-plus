import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Loading, Empty, Badge } from "../../components/ui";
import { api, type ClinicalCase } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { colors, space, typography } from "../../lib/theme";

export default function CasesScreen() {
  const router = useRouter();
  const { data, loading, refreshing, refresh } = useAsync<{ items: ClinicalCase[] }>(() => api.cases());

  if (loading) return <Loading />;
  const items = data?.items ?? [];

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Text style={typography.muted}>
        Клиническая задача → тест → результат → разбор. Одна попытка на каждый случай.
      </Text>
      {items.length === 0 ? (
        <Empty text="Новых случаев пока нет." />
      ) : (
        items.map((c) => (
          <Pressable key={c.id} onPress={() => router.push(`/case/${c.id}`)}>
            <Card>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={typography.h3}>{c.title}</Text>
                  {c.specialty ? <Badge text={c.specialty} color={colors.plum} /> : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </View>
              <Text style={typography.body} numberOfLines={2}>{c.scenario}</Text>
              <Text style={[typography.muted, { color: colors.orange }]}>
                {c.questions.length} {pluralQ(c.questions.length)}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function pluralQ(n: number): string {
  const d = n % 10, dd = n % 100;
  if (d === 1 && dd !== 11) return "вопрос";
  if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return "вопроса";
  return "вопросов";
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
});
