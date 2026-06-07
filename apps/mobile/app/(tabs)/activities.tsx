import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Loading, Empty } from "../../components/ui";
import { api, type Activity } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { formatTime } from "../../lib/format";
import { colors, radius, space } from "../../lib/theme";

const WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MON = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЯ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];

function weekStrip(): Date[] {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0 = Пн
  const monday = new Date(now); monday.setDate(now.getDate() - dow); monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
}
function reminderText(min: number) { return min === 0 ? "в начале" : min < 60 ? `за ${min} мин` : `за ${Math.round(min / 60)} ч`; }

export default function ActivitiesScreen() {
  const { data, loading, refreshing, refresh } = useAsync(() => api.activities());
  if (loading) return <Loading />;

  const items = (data?.items ?? []).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const now = Date.now();
  const upcoming = items.filter((a) => +new Date(a.startsAt) >= now);
  const past = items.filter((a) => +new Date(a.startsAt) < now);
  const today = new Date().toDateString();

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Text style={styles.h1}>Активности</Text>
      <Text style={styles.sub}>Анонсы и календарь мероприятий</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {weekStrip().map((d, i) => {
          const isToday = d.toDateString() === today;
          return (
            <View key={i} style={[styles.day, isToday && styles.dayActive]}>
              <Text style={[styles.dayWd, isToday && { color: "rgba(255,255,255,0.7)" }]}>{WD[d.getDay()]}</Text>
              <Text style={[styles.dayNum, isToday && { color: colors.white }]}>{d.getDate()}</Text>
              {isToday && <View style={styles.dayDot} />}
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.section}>Предстоящие</Text>
      {upcoming.length === 0 ? <Empty text="Нет запланированных мероприятий." /> : upcoming.map((e) => <EventCard key={e.id} e={e} />)}

      {past.length > 0 && (
        <>
          <Text style={[styles.section, { marginTop: space.md }]}>Прошедшие</Text>
          {past.map((e) => <EventCard key={e.id} e={e} dim />)}
        </>
      )}
    </Screen>
  );
}

function EventCard({ e, dim }: { e: Activity; dim?: boolean }) {
  const d = new Date(e.startsAt);
  const soonMin = Math.round((+d - Date.now()) / 60000);
  const soon = soonMin >= 0 && soonMin <= 60;
  return (
    <View style={[styles.card, dim && { opacity: 0.65 }]}>
      <View style={styles.dateBadge}>
        <Text style={styles.dateDay}>{String(d.getDate()).padStart(2, "0")}</Text>
        <Text style={styles.dateMon}>{MON[d.getMonth()]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {soon && <View style={styles.soon}><Text style={styles.soonText}>через {soonMin} мин</Text></View>}
        <Text style={styles.cardTitle}>{e.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Ionicons name="time-outline" size={12} color={colors.muted} /><Text style={styles.metaText}>{formatTime(e.startsAt)}–{formatTime(e.endsAt)}</Text></View>
          {e.location ? <View style={styles.metaItem}><Ionicons name="location-outline" size={12} color={colors.muted} /><Text style={styles.metaText}>{e.location}</Text></View> : null}
        </View>
        {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
        {e.reminders?.length ? <Text style={styles.reminders}>🔔 {e.reminders.map(reminderText).join(" · ")}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: colors.plumDeep },
  sub: { fontSize: 14, color: colors.muted, marginBottom: space.md },
  strip: { gap: space.sm, paddingVertical: 2 },
  day: { width: 52, borderRadius: radius.md, paddingVertical: space.sm, alignItems: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  dayActive: { backgroundColor: colors.plum, borderColor: colors.plum },
  dayWd: { fontSize: 10, color: colors.muted },
  dayNum: { fontSize: 16, fontWeight: "800", color: colors.plumDeep },
  dayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.yellow, marginTop: 3 },
  section: { fontSize: 11, fontWeight: "700", color: colors.orange, textTransform: "uppercase", letterSpacing: 1, marginTop: space.md, marginBottom: space.sm },
  card: { flexDirection: "row", gap: space.md, backgroundColor: colors.white, borderRadius: radius.xl, padding: space.lg, borderWidth: 1, borderColor: colors.line, marginBottom: space.sm },
  dateBadge: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: "rgba(255,81,0,0.08)", alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 18, fontWeight: "800", color: colors.orange, lineHeight: 20 },
  dateMon: { fontSize: 10, color: colors.orange },
  soon: { alignSelf: "flex-start", backgroundColor: colors.orange, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  soonText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.plumDeep, marginBottom: 4 },
  metaRow: { flexDirection: "row", gap: space.md, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: colors.muted },
  desc: { fontSize: 13, color: colors.ink, marginTop: 6 },
  reminders: { fontSize: 11, color: colors.plum, marginTop: 6 },
});
