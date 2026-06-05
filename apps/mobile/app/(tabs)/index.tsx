import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, ProgressBar, Loading, Badge } from "../../components/ui";
import { Logo } from "../../components/Logo";
import { api } from "../../lib/api";
import type { Activity, NewsItem, ClinicalCase } from "../../lib/api";
import type { Plan } from "@clinic-plus/shared";
import { useAsync } from "../../lib/hooks";
import { planProgress, formatDateTime, formatDate } from "../../lib/format";
import { colors, space, typography, radius, warmCopy } from "../../lib/theme";

interface Dash {
  plan: Plan;
  nextActivity: Activity | null;
  latestNews: NewsItem | null;
  newCase: ClinicalCase | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, loading, refreshing, refresh } = useAsync<Dash>(async () => {
    const now = new Date().toISOString();
    const [plan, acts, news, cases] = await Promise.all([
      api.planMe(),
      api.activities(now),
      api.news(1, 1),
      api.cases(),
    ]);
    const upcoming = acts.items
      .filter((a) => new Date(a.startsAt) >= new Date())
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    return {
      plan,
      nextActivity: upcoming[0] ?? null,
      latestNews: news.items[0] ?? null,
      newCase: cases.items[0] ?? null,
    };
  });

  if (loading || !data) return <Loading />;
  const prog = planProgress(data.plan);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.hero}>
        <Logo size={30} light />
        <Text style={styles.heroGreeting}>{warmCopy.greeting} 👋</Text>
      </View>

      {/* Прогресс плана */}
      <Pressable onPress={() => router.push("/path")}>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={typography.h3}>План года</Text>
            <Badge text={`${prog.pct}%`} color={colors.orange} />
          </View>
          <Text style={typography.muted} numberOfLines={1}>
            {data.plan.mission || "Миссия пока не задана"}
          </Text>
          <ProgressBar pct={prog.pct} />
          <Text style={typography.muted}>{prog.done} из {prog.total} задач выполнено</Text>
        </Card>
      </Pressable>

      {/* Ближайшее мероприятие */}
      <Pressable onPress={() => router.push("/activities")}>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={typography.h3}>Ближайшее мероприятие</Text>
            <Ionicons name="calendar" size={18} color={colors.plum} />
          </View>
          {data.nextActivity ? (
            <>
              <Text style={[typography.body, { fontWeight: "700" }]}>{data.nextActivity.title}</Text>
              <Text style={typography.muted}>{formatDateTime(data.nextActivity.startsAt)}</Text>
              {data.nextActivity.location ? (
                <Text style={typography.muted}>📍 {data.nextActivity.location}</Text>
              ) : null}
            </>
          ) : (
            <Text style={typography.muted}>Пока нет запланированных мероприятий.</Text>
          )}
        </Card>
      </Pressable>

      {/* Новость */}
      <Pressable onPress={() => router.push("/news")}>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={typography.h3}>Свежее в новостях</Text>
            <Ionicons name="newspaper" size={18} color={colors.plum} />
          </View>
          {data.latestNews ? (
            <>
              <Text style={[typography.body, { fontWeight: "700" }]} numberOfLines={2}>{data.latestNews.title}</Text>
              <Text style={typography.muted}>{formatDate(data.latestNews.publishedAt)}</Text>
            </>
          ) : (
            <Text style={typography.muted}>Новостей пока нет.</Text>
          )}
        </Card>
      </Pressable>

      {/* Новый случай */}
      {data.newCase ? (
        <Pressable onPress={() => router.push(`/case/${data.newCase!.id}`)}>
          <View style={styles.caseCta}>
            <Ionicons name="medkit" size={22} color={colors.white} />
            <View style={{ flex: 1 }}>
              <Text style={styles.caseCtaTitle}>Новый случай из практики</Text>
              <Text style={styles.caseCtaSub} numberOfLines={1}>{data.newCase.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.white} />
          </View>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.plum, borderRadius: radius.lg, padding: space.lg, gap: space.sm,
  },
  heroGreeting: { ...typography.onPlum, fontSize: 18, fontWeight: "700" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  caseCta: {
    backgroundColor: colors.orange, borderRadius: radius.md, padding: space.lg,
    flexDirection: "row", alignItems: "center", gap: space.md,
  },
  caseCtaTitle: { color: colors.white, fontWeight: "800", fontSize: 15 },
  caseCtaSub: { color: colors.white, opacity: 0.9, fontSize: 13 },
});
