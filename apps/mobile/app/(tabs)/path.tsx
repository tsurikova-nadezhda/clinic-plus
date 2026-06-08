import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, RefreshControl } from "react-native";
import { Progress, Loading, Empty, Field, Button } from "../../components/ui";
import { BalanceWheel } from "../../components/BalanceWheel";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { api, type Win } from "../../lib/api";
import type { Plan, Task, Quarter, ArchiveYear } from "@clinic-plus/shared";
import { useAuth } from "../../lib/auth";
import { useAsync } from "../../lib/hooks";
import { planProgress } from "../../lib/format";
import { colors, gradients, diag, radius, space, tint, warmCopy } from "../../lib/theme";

type Seg = "plan" | "diary" | "archive";
const YEAR = new Date().getFullYear();

export default function PathScreen() {
  const { user, logout } = useAuth();
  const [seg, setSeg] = useState<Seg>("plan");

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.plum }} />
      <LinearGradient colors={gradients.plum} start={diag.start} end={diag.end} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerKicker}>{user?.name || "Врач"} · {user?.role === "admin" ? "руководитель" : "педиатр"}</Text>
          <Pressable onPress={logout} hitSlop={10}><Ionicons name="log-out-outline" size={20} color={colors.white} /></Pressable>
        </View>
        <Text style={styles.headerTitle}>Мой путь развития</Text>
        <View style={styles.segment}>
          {([["plan", "План года"], ["diary", "Успехи"], ["archive", "Архив"]] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setSeg(k)} style={[styles.segBtn, seg === k && styles.segBtnActive]}>
              <Text style={[styles.segText, { color: seg === k ? colors.plum : colors.white }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>
      {seg === "plan" && <PlanTab />}
      {seg === "diary" && <DiaryTab />}
      {seg === "archive" && <ArchiveTab />}
    </View>
  );
}

function Body({ children, onRefresh, refreshing }: { children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.plum} /> : undefined}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ScrollView>
  );
}

// ───────── ПЛАН ГОДА ─────────
const STATUS_NEXT: Record<Task["status"], Task["status"]> = { pending: "in_progress", in_progress: "done", done: "pending" };
const TYPE_LABEL: Record<Task["type"], string> = { course: "Курс", book: "Книга", media: "Медиа", practice: "Практика" };
const SPHERES = ["Карьера", "Здоровье", "Семья", "Друзья", "Рост", "Финансы", "Отдых", "Дух"];

function StatusIcon({ s }: { s: Task["status"] }) {
  if (s === "done") return <Ionicons name="checkmark-circle" size={22} color={colors.orange} />;
  if (s === "in_progress") return <Ionicons name="ellipse-outline" size={22} color={colors.plum} />;
  return <Ionicons name="ellipse-outline" size={22} color={colors.muted} />;
}

function PlanTab() {
  const { data: plan, loading, error, refreshing, refresh, setData } = useAsync<Plan>(() => api.planMe());
  const [openQ, setOpenQ] = useState(0);
  const [start, setStart] = useState([7, 6, 7, 8, 5, 5, 7, 8]);
  const [end, setEnd] = useState([8, 8, 8, 9, 7, 7, 8, 9]);
  const [editWheel, setEditWheel] = useState(false);

  if (loading) return <Body><Loading /></Body>;
  if (!plan) return <Body onRefresh={refresh} refreshing={refreshing}><Empty text={error ? `Ошибка загрузки: ${error}` : "Не удалось загрузить план."} /></Body>;
  const prog = planProgress(plan);
  const quarters = plan.quarters ?? [];

  async function cycle(t: Task) {
    const next = STATUS_NEXT[t.status];
    setData({ ...plan!, quarters: plan!.quarters.map((q) => ({ ...q, tasks: q.tasks.map((x) => x.id === t.id ? { ...x, status: next } : x) })) });
    try { await api.patchTask(t.id, next); } catch { refresh(); }
  }
  const saveReflection = (scope: Quarter["q"] | "year", text: string) => { if (text.trim()) api.putReflection(YEAR, scope, text.trim()).catch(() => {}); };
  const saveWheel = (phase: "start" | "end", vals: number[]) => api.putBalance(YEAR, phase, vals).catch(() => {});

  return (
    <Body onRefresh={refresh} refreshing={refreshing}>
      {/* прогресс */}
      <View style={[styles.card, styles.rowCenter]}>
        <View style={{ flex: 1 }}><Progress pct={prog.pct} /></View>
        <Text style={styles.pct}>{prog.pct}%</Text>
      </View>

      {/* миссия */}
      <View style={styles.card}>
        <Text style={styles.cap}>Миссия года</Text>
        <Text style={styles.body15}>{plan.mission || "Миссия пока не задана руководителем."}</Text>
      </View>

      {/* PDF индивидуального плана развития */}
      {plan.pdfUrl ? (
        <Pressable onPress={() => Linking.openURL(plan.pdfUrl!)} style={styles.pdfBtn}>
          <Ionicons name="document-text" size={20} color={colors.plum} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pdfTitle}>Полный план развития (PDF)</Text>
            <Text style={styles.muted12}>Открыть подробный документ ИПР</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.muted} />
        </Pressable>
      ) : null}

      {/* колесо баланса */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cap}>Колесо баланса</Text>
          <Pressable onPress={() => setEditWheel((v) => !v)}><Text style={styles.link}>{editWheel ? "готово" : "изменить"}</Text></Pressable>
        </View>
        <Text style={styles.muted12}>Сравнение: начало и конец года</Text>
        <BalanceWheel start={start} end={end} labels={SPHERES} />
        {editWheel && (
          <View style={{ marginTop: space.sm, gap: space.sm }}>
            {SPHERES.map((label, i) => (
              <View key={label} style={styles.wheelRow}>
                <Text style={styles.wheelLabel}>{label}</Text>
                <DualStepper
                  s={start[i]} e={end[i]}
                  onS={(v) => { const n = [...start]; n[i] = v; setStart(n); saveWheel("start", n); }}
                  onE={(v) => { const n = [...end]; n[i] = v; setEnd(n); saveWheel("end", n); }}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Правило 50% */}
      <View style={styles.rule}>
        <Ionicons name="ribbon" size={28} color={colors.orange} />
        <Text style={styles.ruleText}><Text style={{ fontWeight: "800" }}>Правило 50%: </Text>выполнить половину плана — это уже грандиозный успех.</Text>
      </View>

      {/* кварталы */}
      <Text style={styles.section}>Четыре шага года</Text>
      {quarters.length === 0 ? <Empty text="Руководитель ещё не загрузил ваш план на этот год." /> : quarters.map((Q, qi) => {
        const open = openQ === qi;
        return (
          <View key={qi} style={styles.qCard}>
            <Pressable onPress={() => setOpenQ(open ? -1 : qi)} style={styles.qHead}>
              <LinearGradient colors={gradients.progress} start={diag.start} end={diag.end} style={styles.qBadge}><Text style={styles.qBadgeText}>{Q.q}</Text></LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.qTitle}>{Q.title}</Text>
                <Text style={styles.qFocus}>{Q.focus}</Text>
              </View>
              <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={18} color={open ? colors.plum : colors.muted} />
            </Pressable>
            {open && (
              <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
                {Q.tasks.length > 0 ? Q.tasks.map((t) => (
                  <Pressable key={t.id} onPress={() => cycle(t)} style={styles.taskRow}>
                    <StatusIcon s={t.status} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.tagWrap}><Text style={styles.tag}>{TYPE_LABEL[t.type]}</Text></View>
                      <Text style={[styles.taskText, t.status === "done" && styles.taskDone]}>{t.text}</Text>
                    </View>
                  </Pressable>
                )) : <Text style={styles.taskEmpty}>Задачи появятся ближе к кварталу</Text>}
                <View style={styles.insight}>
                  <Text style={styles.insightCap}>✏️ Инсайт квартала</Text>
                  <TextInput style={styles.insightInput} multiline placeholder="Что сработало? Какие 2 фишки внедрила в практику?"
                    placeholderTextColor={colors.muted} onEndEditing={(e) => saveReflection(Q.q, e.nativeEvent.text)} />
                </View>
              </View>
            )}
          </View>
        );
      })}

      {/* итоги года */}
      <View style={[styles.card, { backgroundColor: tint.yellow12 }]}>
        <Text style={[styles.cap, { color: colors.plumDeep }]}>✨ Итоги года</Text>
        <TextInput style={[styles.insightInput, { minHeight: 90 }]} multiline
          placeholder={"Главный прорыв года:\nЧему научилась в отношениях с собой:\nКак изменилось ощущение внутренней свободы:"}
          placeholderTextColor={colors.muted} onEndEditing={(e) => saveReflection("year", e.nativeEvent.text)} />
      </View>
      <Text style={styles.foot}>Записи сохраняются навсегда и не теряются при обновлении плана</Text>
    </Body>
  );
}

function DualStepper({ s, e, onS, onE }: { s: number; e: number; onS: (v: number) => void; onE: (v: number) => void }) {
  const btn = (label: string, val: number, set: (v: number) => void, color: string) => (
    <View style={styles.dual}>
      <Pressable onPress={() => set(Math.max(0, val - 1))} style={styles.stepBtn}><Ionicons name="remove" size={14} color={color} /></Pressable>
      <Text style={[styles.stepVal, { color }]}>{val}</Text>
      <Pressable onPress={() => set(Math.min(10, val + 1))} style={styles.stepBtn}><Ionicons name="add" size={14} color={color} /></Pressable>
    </View>
  );
  return (
    <View style={{ flexDirection: "row", gap: space.sm }}>
      {btn("н", s, onS, colors.plum)}
      {btn("к", e, onE, colors.orange)}
    </View>
  );
}

// ───────── УСПЕХИ ─────────
const CAT_COLOR: Record<string, string> = { "Профессия": colors.plum, "Блог": colors.orange, "Личное": colors.green, "Обучение": colors.blue };
const CATS = ["Профессия", "Блог", "Личное", "Обучение"];

function DiaryTab() {
  const { data, loading, refreshing, refresh, setData } = useAsync<{ items: Win[] }>(() => api.wins());
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [cat, setCat] = useState(CATS[0]);
  const [busy, setBusy] = useState(false);

  if (loading) return <Body><Loading /></Body>;
  const wins = data?.items ?? [];

  async function add() {
    if (!text.trim()) return;
    setBusy(true);
    try { const w = await api.addWin(text.trim(), cat); setData({ items: [w, ...wins] }); setText(""); setAdding(false); }
    finally { setBusy(false); }
  }

  return (
    <Body onRefresh={refresh} refreshing={refreshing}>
      <LinearGradient colors={gradients.orange} start={diag.start} end={diag.end} style={styles.trophy}>
        <Ionicons name="trophy" size={32} color={colors.white} />
        <Text style={styles.trophyNum}>{wins.length} {plural(wins.length, "успех", "успеха", "успехов")} записано</Text>
        <Text style={styles.trophySub}>Каждая победа важна — большая и маленькая</Text>
      </LinearGradient>

      {!adding ? (
        <Pressable onPress={() => setAdding(true)} style={styles.addBtn}><Ionicons name="add" size={18} color={colors.white} /><Text style={styles.addBtnText}>Записать успех</Text></Pressable>
      ) : (
        <View style={styles.card}>
          <Field value={text} onChangeText={setText} placeholder="Что хорошего получилось? Даже маленькое — важно." multiline />
          <View style={styles.catRow}>
            {CATS.map((c) => (
              <Pressable key={c} onPress={() => setCat(c)} style={[styles.catChip, c === cat && { backgroundColor: colors.plum }]}>
                <Text style={[styles.catChipText, c === cat && { color: colors.white }]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button title="Сохранить" onPress={add} loading={busy} disabled={!text.trim()} style={{ flex: 1 }} />
            <Button title="Отмена" variant="ghost" onPress={() => { setAdding(false); setText(""); }} />
          </View>
        </View>
      )}

      {wins.length === 0 ? <Empty text={warmCopy.emptyDiary} /> : wins.map((w) => (
        <View key={w.id} style={styles.winCard}>
          <View style={[styles.winBar, { backgroundColor: CAT_COLOR[w.category] ?? colors.plum }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.rowBetween}>
              <View style={[styles.catBadge, { backgroundColor: (CAT_COLOR[w.category] ?? colors.plum) + "22" }]}>
                <Text style={{ color: CAT_COLOR[w.category] ?? colors.plum, fontSize: 10, fontWeight: "700" }}>{w.category}</Text>
              </View>
            </View>
            <Text style={styles.body15}>{w.text}</Text>
          </View>
        </View>
      ))}
    </Body>
  );
}

// ───────── АРХИВ ─────────
function ArchiveTab() {
  const { data, loading, refreshing, refresh } = useAsync<{ years: ArchiveYear[] }>(() => api.archive());
  if (loading) return <Body><Loading /></Body>;
  const years = (data?.years ?? []).sort((a, b) => b.year - a.year);

  return (
    <Body onRefresh={refresh} refreshing={refreshing}>
      <Text style={styles.section}>Ваш путь в клинике</Text>
      {years.length === 0 ? <Empty text="Здесь будет история ваших лет в профессии." /> : years.map((y) => (
        <View key={y.year} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.yearNum}>{y.year}</Text>
            {y.showPercentage && y.percentage != null
              ? <View style={[styles.yearBadge, { backgroundColor: tint.green15 }]}><Text style={{ color: colors.greenDeep, fontSize: 12, fontWeight: "700" }}>Выполнено {y.percentage}%</Text></View>
              : <View style={[styles.yearBadge, { backgroundColor: tint.plum10 }]}><Text style={{ color: colors.plum, fontSize: 12, fontWeight: "700" }}>Год в профессии</Text></View>}
          </View>
          {y.achievements.length > 0 ? y.achievements.map((a, i) => (
            <View key={i} style={styles.achRow}><Ionicons name="checkmark-circle" size={15} color={colors.orange} /><Text style={styles.achText}>{a}</Text></View>
          )) : <Text style={styles.muted12}>двигались вперёд в своём темпе.</Text>}
          {!y.showPercentage ? <Text style={styles.warm}>🌱 {warmCopy.archiveLow}</Text> : null}
        </View>
      ))}
      <View style={[styles.card, { backgroundColor: tint.plum08, alignItems: "center" }]}>
        <Ionicons name="archive-outline" size={22} color={colors.muted} />
        <Text style={[styles.muted12, { textAlign: "center", marginTop: 4 }]}>Архив хранит все ваши планы, колёса баланса и рефлексии за каждый год</Text>
      </View>
    </Body>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const d = n % 10, dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return few;
  return many;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerKicker: { color: colors.yellow, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: "800", marginVertical: space.sm },
  segment: { flexDirection: "row", gap: 4, padding: 4, borderRadius: radius.md, backgroundColor: "rgba(255,255,255,0.15)" },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: "center" },
  segBtnActive: { backgroundColor: colors.white },
  segText: { fontSize: 13, fontWeight: "700" },
  body: { padding: space.lg, paddingBottom: 90, gap: space.md },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: colors.line, gap: 6 },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: space.md },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pct: { color: colors.plum, fontWeight: "800", fontSize: 15 },
  cap: { fontSize: 11, fontWeight: "700", color: colors.orange, textTransform: "uppercase", letterSpacing: 0.5 },
  body15: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  muted12: { fontSize: 12, color: colors.muted },
  link: { fontSize: 12, color: colors.plum, fontWeight: "700" },
  pdfBtn: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.white, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: colors.plum },
  pdfTitle: { fontSize: 14, fontWeight: "700", color: colors.plumDeep },
  wheelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wheelLabel: { fontSize: 13, color: colors.ink, flex: 1 },
  dual: { flexDirection: "row", alignItems: "center", gap: 2 },
  stepBtn: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  stepVal: { width: 20, textAlign: "center", fontWeight: "800", fontSize: 13 },
  rule: { flexDirection: "row", alignItems: "center", gap: space.md, borderRadius: radius.md, padding: space.lg, backgroundColor: tint.yellow18 },
  ruleText: { flex: 1, fontSize: 14, color: colors.plumDeep, lineHeight: 20 },
  section: { fontSize: 11, fontWeight: "700", color: colors.orange, textTransform: "uppercase", letterSpacing: 1, marginTop: space.xs },
  qCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  qHead: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  qBadge: { width: 48, height: 48, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  qBadgeText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  qTitle: { fontSize: 14, fontWeight: "700", color: colors.plumDeep },
  qFocus: { fontSize: 12, color: colors.muted, fontStyle: "italic", marginTop: 2 },
  taskRow: { flexDirection: "row", gap: space.md, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.line, alignItems: "flex-start" },
  tagWrap: { alignSelf: "flex-start", backgroundColor: tint.plum10, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1, marginBottom: 3 },
  tag: { fontSize: 10, color: colors.plum, fontWeight: "700" },
  taskText: { fontSize: 14, color: colors.ink },
  taskDone: { textDecorationLine: "line-through", color: colors.muted },
  taskEmpty: { fontSize: 12, color: colors.muted, fontStyle: "italic", paddingTop: space.sm },
  insight: { marginTop: space.sm, borderRadius: radius.sm, padding: space.md, backgroundColor: tint.yellow12 },
  insightCap: { fontSize: 12, fontWeight: "700", color: colors.plum, marginBottom: 4 },
  insightInput: { backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, padding: space.sm, fontSize: 13, color: colors.ink, textAlignVertical: "top", minHeight: 48 },
  foot: { fontSize: 12, color: colors.muted, textAlign: "center" },
  trophy: { borderRadius: radius.md, padding: space.lg, alignItems: "center", gap: 4 },
  trophyNum: { color: colors.white, fontWeight: "800", fontSize: 18 },
  trophySub: { color: colors.white, opacity: 0.9, fontSize: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.plum, borderRadius: radius.md, paddingVertical: 13 },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginVertical: space.sm },
  catChip: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: tint.plum10 },
  catChipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  winCard: { flexDirection: "row", gap: space.md, backgroundColor: colors.white, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: colors.line },
  winBar: { width: 4, borderRadius: 2 },
  catBadge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  yearNum: { fontSize: 18, fontWeight: "800", color: colors.plumDeep },
  yearBadge: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  achRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 2 },
  achText: { flex: 1, fontSize: 14, color: colors.ink },
  warm: { fontSize: 12, color: colors.plumDeep, fontStyle: "italic", marginTop: space.sm, backgroundColor: tint.yellow12, padding: space.sm, borderRadius: radius.sm },
});
