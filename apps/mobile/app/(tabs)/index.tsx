import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Progress, Loading, Empty } from "../../components/ui";
import { Logo } from "../../components/Logo";
import { api, type Activity, type NewsItem, type ClinicalCase } from "../../lib/api";
import type { Plan } from "@clinic-plus/shared";
import { useAuth } from "../../lib/auth";
import { useAsync } from "../../lib/hooks";
import { planProgress, formatTime } from "../../lib/format";
import { colors, gradients, diag, radius, space, tint, warmCopy } from "../../lib/theme";

interface Dash { plan: Plan; next: Activity | null; newsTotal: number; firstCase: ClinicalCase | null }

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}
function untilLabel(iso: string): string {
  const m = Math.round((+new Date(iso) - Date.now()) / 60000);
  if (m < 0) return "Идёт сейчас";
  if (m < 60) return `Через ${m} мин`;
  if (m < 60 * 24) return `Через ${Math.round(m / 60)} ч`;
  const d = Math.round(m / (60 * 24));
  return `Через ${d} дн`;
}
function currentQuarter(plan: Plan) {
  const q = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
  return plan.quarters?.find((x) => x.q === q) ?? plan.quarters?.find((x) => x.tasks.some((t) => t.status !== "done")) ?? plan.quarters?.[0];
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [banner, setBanner] = useState(false);
  const { data, loading, error, refreshing, refresh } = useAsync<Dash>(async () => {
    const nowIso = new Date().toISOString();
    const [plan, acts, news, cases] = await Promise.all([
      api.planMe(), api.activities(nowIso), api.news(1, 1), api.cases(),
    ]);
    const upcoming = acts.items.filter((a) => +new Date(a.startsAt) >= Date.now()).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    return { plan, next: upcoming[0] ?? null, newsTotal: news.total, firstCase: cases.items[0] ?? null };
  });

  if (loading) return <Loading />;
  if (!data) return <Screen onRefresh={refresh} refreshing={refreshing}><Empty text={error ? `Ошибка загрузки: ${error}` : "Не удалось загрузить данные. Потяните вниз, чтобы обновить."} /></Screen>;
  const prog = planProgress(data.plan);
  const q = currentQuarter(data.plan);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {banner && (
        <View style={styles.banner}>
          <View style={styles.bannerIcon}><Ionicons name="notifications" size={18} color={colors.white} /></View>
          <View style={{ flex: 1 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.bannerTitle}>Клиника ПЛЮС</Text>
              <Text style={styles.bannerTime}>сейчас</Text>
            </View>
            <Text style={styles.bannerBody} numberOfLines={2}>
              ⏰ {data.next ? `${untilLabel(data.next.startsAt)}: «${data.next.title}»` : "Напоминание о мероприятии"}
            </Text>
          </View>
          <Pressable onPress={() => setBanner(false)} hitSlop={8}><Ionicons name="close" size={16} color={colors.muted} /></Pressable>
        </View>
      )}

      {/* Шапка */}
      <View style={styles.topRow}>
        <Logo compact size={22} />
        <Pressable onPress={() => setBanner(true)} style={styles.bell}>
          <Ionicons name="notifications" size={20} color={colors.white} />
          <View style={styles.bellBadge}><Text style={styles.bellBadgeText}>3</Text></View>
        </Pressable>
      </View>

      <Text style={styles.kickerMuted}>{greeting()},</Text>
      <Text style={styles.h1}>{user?.name || "коллега"}</Text>

      {/* Ближайшее мероприятие */}
      <Pressable onPress={() => router.push("/activities")}>
        <LinearGradient colors={gradients.plum} start={diag.start} end={diag.end} style={styles.heroCard}>
          <View style={styles.heroBlob} />
          {data.next ? (
            <>
              <Text style={styles.heroKicker}>{untilLabel(data.next.startsAt)}</Text>
              <Text style={styles.heroTitle}>{data.next.title}</Text>
              <View style={styles.heroMeta}>
                <View style={styles.metaItem}><Ionicons name="time-outline" size={13} color={colors.white} /><Text style={styles.heroMetaText}>{formatTime(data.next.startsAt)}–{formatTime(data.next.endsAt)}</Text></View>
                {data.next.location ? <View style={styles.metaItem}><Ionicons name="location-outline" size={13} color={colors.white} /><Text style={styles.heroMetaText}>{data.next.location}</Text></View> : null}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.heroKicker}>Активности</Text>
              <Text style={styles.heroTitle}>Пока нет запланированных мероприятий</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      <Pressable onPress={() => setBanner(true)} style={styles.demoBtn}>
        <Ionicons name="notifications-outline" size={14} color={colors.orange} />
        <Text style={styles.demoBtnText}>Показать пример уведомления</Text>
      </Pressable>

      {/* План на год */}
      <Pressable onPress={() => router.push("/path")} style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.metaItem}><Ionicons name="trending-up" size={18} color={colors.orange} /><Text style={styles.cardTitle}>Мой план на год</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
        <View style={[styles.metaItem, { gap: space.md, marginTop: space.sm }]}>
          <View style={{ flex: 1 }}><Progress pct={prog.pct} /></View>
          <Text style={styles.pct}>{prog.pct}%</Text>
        </View>
        {q ? <Text style={styles.cardSub}>{q.q} · {q.title}</Text> : null}
      </Pressable>

      {/* Две плитки */}
      <View style={styles.grid}>
        <Pressable onPress={() => router.push("/cases")} style={{ flex: 1 }}>
          <LinearGradient colors={gradients.orange} start={diag.start} end={diag.end} style={styles.tile}>
            <Ionicons name="medkit" size={26} color={colors.white} />
            <Text style={styles.tileTitle}>Новый случай из практики</Text>
            <Text style={styles.tileSub}>Решить задачу →</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={() => router.push("/news")} style={[styles.tile, styles.tileWhite, { flex: 1 }]}>
          <Ionicons name="newspaper" size={26} color={colors.plum} />
          <Text style={[styles.tileTitle, { color: colors.plumDeep }]}>{data.newsTotal} {plural(data.newsTotal, "новость", "новости", "новостей")} медицины</Text>
          <Text style={[styles.tileSub, { color: colors.muted }]}>за две недели →</Text>
        </Pressable>
      </View>

      {/* Цитата */}
      <View style={styles.quote}>
        <Text style={styles.quoteText}>{warmCopy.homeQuote}</Text>
      </View>
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
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.xs },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.plum, alignItems: "center", justifyContent: "center" },
  bellBadge: { position: "absolute", top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  bellBadgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  kickerMuted: { color: colors.muted, fontSize: 13 },
  h1: { color: colors.plumDeep, fontSize: 22, fontWeight: "800", marginBottom: space.xs },
  heroCard: { borderRadius: radius.xl, padding: space.lg, overflow: "hidden" },
  heroBlob: { position: "absolute", right: -24, top: -24, width: 112, height: 112, borderRadius: 56, backgroundColor: colors.yellow, opacity: 0.2 },
  heroKicker: { color: colors.yellow, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  heroTitle: { color: colors.white, fontSize: 18, fontWeight: "800", marginBottom: space.sm },
  heroMeta: { flexDirection: "row", gap: space.md },
  heroMetaText: { color: colors.white, opacity: 0.9, fontSize: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  demoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: colors.orange, borderRadius: radius.sm, paddingVertical: 11 },
  demoBtnText: { color: colors.orange, fontSize: 13, fontWeight: "700" },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: space.lg, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.plumDeep, fontWeight: "700", fontSize: 15 },
  cardSub: { color: colors.muted, fontSize: 12, marginTop: space.sm },
  pct: { color: colors.plum, fontWeight: "800", fontSize: 15 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  grid: { flexDirection: "row", gap: space.md },
  tile: { borderRadius: radius.xl, padding: space.lg, gap: 4, minHeight: 120, justifyContent: "space-between" },
  tileWhite: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  tileTitle: { color: colors.white, fontWeight: "700", fontSize: 14, marginTop: space.lg },
  tileSub: { color: colors.white, opacity: 0.85, fontSize: 12 },
  quote: { borderRadius: radius.xl, padding: space.lg, backgroundColor: tint.yellow18, alignItems: "center" },
  quoteText: { color: colors.plumDeep, fontStyle: "italic", fontSize: 14, textAlign: "center" },
  banner: { flexDirection: "row", gap: 10, backgroundColor: colors.white, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.line, alignItems: "flex-start" },
  bannerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" },
  bannerTitle: { fontSize: 12, fontWeight: "800", color: colors.plumDeep },
  bannerTime: { fontSize: 10, color: colors.muted },
  bannerBody: { fontSize: 12, color: colors.ink, marginTop: 2 },
});
