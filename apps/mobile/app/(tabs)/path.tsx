import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen, Card, Button, Field, ProgressBar, Loading, Empty, Badge, SectionTitle,
} from "../../components/ui";
import { api, type Win } from "../../lib/api";
import type { Plan, Task, ArchiveYear } from "@clinic-plus/shared";
import { useAsync } from "../../lib/hooks";
import { planProgress } from "../../lib/format";
import { colors, space, typography, radius, warmCopy } from "../../lib/theme";

type Segment = "plan" | "diary" | "archive";
const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "plan", label: "План года" },
  { key: "diary", label: "Дневник успеха" },
  { key: "archive", label: "Архив" },
];

export default function PathScreen() {
  const [seg, setSeg] = useState<Segment>("plan");
  return (
    <Screen scroll={false}>
      <View style={styles.segmentWrap}>
        {SEGMENTS.map((s) => {
          const active = s.key === seg;
          return (
            <Pressable key={s.key} onPress={() => setSeg(s.key)} style={[styles.segment, active && styles.segmentActive]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {seg === "plan" && <PlanTab />}
      {seg === "diary" && <DiaryTab />}
      {seg === "archive" && <ArchiveTab />}
    </Screen>
  );
}

// ─────────────────────────────────────────────
//  ВКЛАДКА: План года
// ─────────────────────────────────────────────
const STATUS_NEXT: Record<Task["status"], Task["status"]> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};
const STATUS_META: Record<Task["status"], { icon: any; color: string; label: string }> = {
  pending: { icon: "ellipse-outline", color: colors.muted, label: "не начато" },
  in_progress: { icon: "time", color: colors.yellow, label: "в процессе" },
  done: { icon: "checkmark-circle", color: colors.green, label: "готово" },
};
const BALANCE_SPHERES = ["Здоровье", "Карьера", "Финансы", "Отношения", "Развитие", "Отдых", "Окружение", "Смысл"];

function PlanTab() {
  const year = new Date().getFullYear();
  const { data: plan, loading, refreshing, refresh, setData } = useAsync<Plan>(() => api.planMe());
  const [balance, setBalance] = useState<number[]>(Array(8).fill(5));
  const [reflection, setReflection] = useState("");
  const [savingB, setSavingB] = useState(false);
  const [savingR, setSavingR] = useState(false);
  const [savedB, setSavedB] = useState(false);
  const [savedR, setSavedR] = useState(false);

  if (loading || !plan) return <Loading />;
  const prog = planProgress(plan);
  const hasPlan = (plan.quarters?.length ?? 0) > 0;

  async function cycle(task: Task) {
    const next = STATUS_NEXT[task.status];
    // оптимистичное обновление
    setData({
      ...plan!,
      quarters: plan!.quarters.map((q) => ({
        ...q,
        tasks: q.tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t)),
      })),
    });
    try { await api.patchTask(task.id, next); } catch { refresh(); }
  }

  async function saveBalance() {
    setSavingB(true);
    try { await api.putBalance(year, "start", balance); setSavedB(true); } finally { setSavingB(false); }
  }
  async function saveReflection() {
    if (!reflection.trim()) return;
    setSavingR(true);
    try { await api.putReflection(year, "year", reflection.trim()); setSavedR(true); } finally { setSavingR(false); }
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Card>
        <Text style={typography.h2}>{year} — мой план</Text>
        <Text style={typography.body}>{plan.mission || "Миссия пока не задана руководителем."}</Text>
        <ProgressBar pct={prog.pct} />
        <Text style={typography.muted}>{prog.done} из {prog.total} задач · {prog.pct}%</Text>
      </Card>

      {!hasPlan ? (
        <Empty text="Руководитель ещё не загрузил ваш план на этот год. Он появится здесь." />
      ) : (
        plan.quarters.map((q) => (
          <Card key={q.q}>
            <View style={styles.rowBetween}>
              <Text style={typography.h3}>{q.q} · {q.title}</Text>
              <Badge text={q.focus} color={colors.plum} />
            </View>
            {q.tasks.map((t) => {
              const m = STATUS_META[t.status];
              return (
                <Pressable key={t.id} onPress={() => cycle(t)} style={styles.taskRow}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, t.status === "done" && styles.taskDone]}>{t.text}</Text>
                    <Text style={[typography.muted, { color: m.color }]}>{typeLabel(t.type)} · {m.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        ))
      )}

      {/* Колесо баланса (§5) */}
      <Card>
        <SectionTitle>Колесо баланса · начало года</SectionTitle>
        <Text style={typography.muted}>Оцените каждую сферу от 0 до 10.</Text>
        {BALANCE_SPHERES.map((label, i) => (
          <Stepper
            key={label} label={label} value={balance[i]}
            onChange={(v) => { const next = [...balance]; next[i] = v; setBalance(next); setSavedB(false); }}
          />
        ))}
        <Button title={savedB ? "Сохранено ✓" : "Сохранить колесо"} onPress={saveBalance} loading={savingB} variant="secondary" />
      </Card>

      {/* Рефлексия года (§5) */}
      <Card>
        <SectionTitle>Рефлексия года</SectionTitle>
        <Field value={reflection} onChangeText={(t) => { setReflection(t); setSavedR(false); }} placeholder="Главный инсайт года…" multiline />
        <Button title={savedR ? "Сохранено ✓" : "Сохранить рефлексию"} onPress={saveReflection} loading={savingR} variant="secondary" />
      </Card>
    </Screen>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={[typography.body, { flex: 1 }]}>{label}</Text>
      <Pressable onPress={() => onChange(Math.max(0, value - 1))} style={styles.stepBtn}>
        <Ionicons name="remove" size={18} color={colors.plum} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(10, value + 1))} style={styles.stepBtn}>
        <Ionicons name="add" size={18} color={colors.plum} />
      </Pressable>
    </View>
  );
}

function typeLabel(t: Task["type"]): string {
  return { course: "курс", book: "книга", media: "медиа", practice: "практика" }[t];
}

// ─────────────────────────────────────────────
//  ВКЛАДКА: Дневник успеха
// ─────────────────────────────────────────────
const WIN_CATEGORIES = ["Профессия", "Блог", "Личное", "Обучение"];

function DiaryTab() {
  const { data, loading, refreshing, refresh, setData } = useAsync<{ items: Win[] }>(() => api.wins());
  const [text, setText] = useState("");
  const [cat, setCat] = useState(WIN_CATEGORIES[0]);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const win = await api.addWin(text.trim(), cat);
      setData({ items: [win, ...(data?.items ?? [])] });
      setText("");
    } finally { setBusy(false); }
  }

  if (loading) return <Loading />;
  const items = data?.items ?? [];

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Card>
        <SectionTitle>Добавить победу</SectionTitle>
        <Field value={text} onChangeText={setText} placeholder="Что получилось? Даже маленькое — важно." multiline />
        <View style={styles.catRow}>
          {WIN_CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setCat(c)} style={[styles.catChip, c === cat && styles.catChipActive]}>
              <Text style={[styles.catChipText, c === cat && styles.catChipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="Записать" onPress={add} loading={busy} disabled={!text.trim()} />
      </Card>

      {items.length === 0 ? (
        <Empty text={warmCopy.emptyDiary} />
      ) : (
        items.map((w) => (
          <Card key={w.id}>
            <Badge text={w.category} color={colors.orange} />
            <Text style={typography.body}>{w.text}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

// ─────────────────────────────────────────────
//  ВКЛАДКА: Архив (бизнес-правило §6.1 — позитивная подача)
// ─────────────────────────────────────────────
function ArchiveTab() {
  const { data, loading, refreshing, refresh } = useAsync<{ years: ArchiveYear[] }>(() => api.archive());
  if (loading) return <Loading />;
  const years = (data?.years ?? []).sort((a, b) => b.year - a.year);

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {years.length === 0 ? (
        <Empty text="Здесь будет история ваших лет в профессии." />
      ) : (
        years.map((y) => <ArchiveCard key={y.year} y={y} />)
      )}
    </Screen>
  );
}

function ArchiveCard({ y }: { y: ArchiveYear }) {
  // §6.1: ≥60% → показываем процент; <60% → процент НЕ показываем,
  // только тёплая подача и список достижений.
  return (
    <Card>
      <View style={styles.rowBetween}>
        <Text style={typography.h2}>{y.year}</Text>
        {y.showPercentage && y.percentage != null ? (
          <Badge text={`${y.percentage}%`} color={colors.green} />
        ) : null}
      </View>
      <Text style={[typography.body, { fontWeight: "700" }]}>{y.mission}</Text>

      {y.showPercentage ? (
        <Text style={typography.muted}>Ваши достижения за год:</Text>
      ) : (
        <Text style={[typography.body, { color: colors.plum }]}>За {y.year} вы:</Text>
      )}

      {y.achievements.length > 0 ? (
        y.achievements.map((a, i) => (
          <View key={i} style={styles.achRow}>
            <Ionicons name="star" size={15} color={colors.yellow} />
            <Text style={[typography.body, { flex: 1 }]}>{a}</Text>
          </View>
        ))
      ) : (
        <Text style={typography.muted}>двигались вперёд в своём темпе.</Text>
      )}

      {!y.showPercentage ? <Text style={styles.warm}>{warmCopy.archiveLow}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  segmentWrap: {
    flexDirection: "row", backgroundColor: "#ece5f3", borderRadius: radius.pill,
    padding: 4, margin: space.lg, marginBottom: 0,
  },
  segment: { flex: 1, paddingVertical: space.sm, borderRadius: radius.pill, alignItems: "center" },
  segmentActive: { backgroundColor: colors.white },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  segmentTextActive: { color: colors.plum },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  taskRow: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: "#f0ebf5",
  },
  taskDone: { textDecorationLine: "line-through", color: colors.muted },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.xs },
  stepBtn: {
    width: 34, height: 34, borderRadius: radius.sm, borderWidth: 1, borderColor: "#e0d8ea",
    alignItems: "center", justifyContent: "center",
  },
  stepValue: { width: 26, textAlign: "center", fontWeight: "800", color: colors.ink, fontSize: 16 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  catChip: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: "#ece5f3" },
  catChipActive: { backgroundColor: colors.plum },
  catChipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  catChipTextActive: { color: colors.white },
  achRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  warm: { ...typography.muted, fontStyle: "italic", color: colors.plum, marginTop: space.xs },
});
