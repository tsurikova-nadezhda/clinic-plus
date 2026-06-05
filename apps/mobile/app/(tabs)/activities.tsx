import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Loading, Empty, Badge, SectionTitle } from "../../components/ui";
import { api, type Activity } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { formatDateTime } from "../../lib/format";
import {
  loadReminderPrefs, saveReminderPrefs, defaultReminderPrefs, type ReminderPrefs,
} from "../../lib/notifications";
import { colors, space, typography, radius } from "../../lib/theme";

export default function ActivitiesScreen() {
  const { data, loading, refreshing, refresh } = useAsync(() => api.activities());
  const [prefs, setPrefs] = useState<ReminderPrefs>(defaultReminderPrefs);

  useEffect(() => { loadReminderPrefs().then(setPrefs); }, []);
  function toggle(key: keyof ReminderPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    saveReminderPrefs(next);
  }

  if (loading) return <Loading />;
  const items = (data?.items ?? []).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const now = Date.now();
  const upcoming = items.filter((a) => +new Date(a.startsAt) >= now);
  const past = items.filter((a) => +new Date(a.startsAt) < now);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {/* Настройки напоминаний (§6.2) */}
      <Card>
        <SectionTitle>Напоминания</SectionTitle>
        <Text style={typography.muted}>Какие push-уведомления о мероприятиях получать:</Text>
        <ReminderRow label="За 2 часа" on={prefs.twoHours} onToggle={() => toggle("twoHours")} />
        <ReminderRow label="За 5 минут" on={prefs.fiveMin} onToggle={() => toggle("fiveMin")} />
        <ReminderRow label="В момент начала" on={prefs.atStart} onToggle={() => toggle("atStart")} />
      </Card>

      <SectionTitle style={{ marginTop: space.sm }}>Предстоящие</SectionTitle>
      {upcoming.length === 0 ? (
        <Empty text="Нет запланированных мероприятий." />
      ) : (
        upcoming.map((a) => <ActivityCard key={a.id} a={a} upcoming />)
      )}

      {past.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: space.md }}>Прошедшие</SectionTitle>
          {past.map((a) => <ActivityCard key={a.id} a={a} />)}
        </>
      )}
    </Screen>
  );
}

function ReminderRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <View style={styles.reminderRow}>
      <Text style={typography.body}>{label}</Text>
      <Switch
        value={on}
        onValueChange={onToggle}
        trackColor={{ true: colors.orange, false: "#d9d2e3" }}
        thumbColor={colors.white}
      />
    </View>
  );
}

function ActivityCard({ a, upcoming }: { a: Activity; upcoming?: boolean }) {
  return (
    <Card style={!upcoming ? { opacity: 0.7 } : undefined}>
      <View style={styles.rowBetween}>
        <Text style={[typography.h3, { flex: 1 }]} numberOfLines={2}>{a.title}</Text>
        {upcoming ? <Badge text="скоро" color={colors.green} /> : null}
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={15} color={colors.muted} />
        <Text style={typography.muted}>{formatDateTime(a.startsAt)}</Text>
      </View>
      {a.location ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color={colors.muted} />
          <Text style={typography.muted}>{a.location}</Text>
        </View>
      ) : null}
      {a.description ? <Text style={typography.body}>{a.description}</Text> : null}
      {a.reminders?.length ? (
        <Text style={[typography.muted, { color: colors.plum }]}>
          🔔 напоминания: {a.reminders.map(labelMin).join(", ")}
        </Text>
      ) : null}
    </Card>
  );
}

function labelMin(m: number): string {
  if (m === 0) return "в начале";
  if (m < 60) return `за ${m} мин`;
  return `за ${Math.round(m / 60)} ч`;
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  reminderRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: space.xs, borderTopWidth: 1, borderTopColor: "#f0ebf5",
  },
});
