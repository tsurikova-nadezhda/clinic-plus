import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Loading, Empty, Button } from "../../components/ui";
import { api, ApiError, type ClinicalCase, type CaseResult } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { colors, radius, space, tint } from "../../lib/theme";

type Step = "scenario" | "test" | "result" | "article" | "done";

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading } = useAsync<ClinicalCase | null>(async () => {
    const all = await api.cases();
    return all.items.find((c) => c.id === id) ?? null;
  }, [id]);

  const [step, setStep] = useState<Step>("scenario");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CaseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Wrap onBack={() => router.back()}><Loading /></Wrap>;
  if (!data) return <Wrap onBack={() => router.back()}><Empty text="Случай не найден." /></Wrap>;
  const c = data;
  const allAnswered = c.questions.every((q) => answers[q.id]);

  async function submit() {
    setBusy(true); setError(null);
    try { setResult(await api.submitCase(c.id, answers)); setStep("result"); }
    catch (e) {
      if (e instanceof ApiError && e.status === 409) setStep("done");
      else setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally { setBusy(false); }
  }

  // ── СЦЕНАРИЙ ──
  if (step === "scenario") return (
    <Wrap onBack={() => router.back()} backLabel="Назад">
      <Text style={styles.kicker}>Условие задачи</Text>
      <Text style={styles.h1}>{c.title}</Text>
      <View style={styles.textCard}><Text style={styles.bodyText}>{c.scenario}</Text></View>
      <Button title="Перейти к тесту  →" onPress={() => setStep("test")} variant="secondary" style={{ marginTop: space.lg }} />
    </Wrap>
  );

  // ── ТЕСТ ──
  if (step === "test") return (
    <Wrap onBack={() => setStep("scenario")} backLabel="Условие">
      <Text style={styles.h1}>Тестирование</Text>
      {c.questions.map((q, qi) => (
        <View key={q.id} style={{ marginTop: space.lg }}>
          <Text style={styles.qText}>{qi + 1}. {q.text}</Text>
          {q.options.map((o) => {
            const sel = answers[q.id] === o.key;
            return (
              <Pressable key={o.key} onPress={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))}
                style={[styles.option, { borderColor: sel ? colors.orange : colors.line, backgroundColor: sel ? tint.orange06 : colors.white }]}>
                <View style={[styles.optKey, { borderColor: sel ? colors.orange : colors.line, backgroundColor: sel ? colors.orange : colors.white }]}>
                  <Text style={{ color: sel ? colors.white : colors.muted, fontWeight: "800", fontSize: 12 }}>{o.key}</Text>
                </View>
                <Text style={styles.optLabel}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Button title="Проверить ответы" onPress={submit} loading={busy} disabled={!allAnswered} style={{ marginTop: space.xl }} />
    </Wrap>
  );

  // ── РЕЗУЛЬТАТ ──
  if (step === "result" && result) return (
    <Wrap onBack={() => router.back()} backLabel="К списку">
      <View style={styles.scoreWrap}>
        <View style={styles.scoreCircle}><Text style={styles.scoreText}>{result.score}/{c.questions.length}</Text></View>
        <Text style={styles.h1}>{result.score === c.questions.length ? "Отлично!" : "Хороший результат"}</Text>
      </View>
      {c.questions.map((q, qi) => {
        const ok = result.correct[q.id];
        return (
          <View key={q.id} style={[styles.resCard, { borderColor: ok ? tint.green40 : tint.orange40, backgroundColor: ok ? tint.green05 : tint.orange06 }]}>
            <View style={styles.resHead}>
              <Ionicons name={ok ? "checkmark-circle" : "close-circle"} size={18} color={ok ? colors.greenDeep : colors.orange} />
              <Text style={styles.resQ}>{qi + 1}. {q.text}</Text>
            </View>
            {result.explanations[q.id] ? <Text style={styles.resExp}>{result.explanations[q.id]}</Text> : null}
          </View>
        );
      })}
      <Button title="Читать разбор" onPress={() => setStep("article")} variant="secondary" style={{ marginTop: space.lg }} />
    </Wrap>
  );

  // ── УЖЕ ПРОЙДЕНО ──
  if (step === "done") return (
    <Wrap onBack={() => router.back()} backLabel="К списку">
      <View style={styles.scoreWrap}>
        <Ionicons name="checkmark-done-circle" size={56} color={colors.green} />
        <Text style={styles.h1}>Этот случай уже пройден</Text>
        <Text style={styles.muted}>На каждый клинический случай — одна попытка. Результат сохранён.</Text>
      </View>
      <Button title="Читать разбор" onPress={() => setStep("article")} variant="secondary" />
    </Wrap>
  );

  // ── СТАТЬЯ / РАЗБОР ──
  return (
    <Wrap onBack={() => router.back()} backLabel="К списку">
      <Text style={styles.kicker}>Разбор · статья</Text>
      <Text style={styles.h1}>{c.title}</Text>
      <View style={styles.textCard}>
        <Text style={styles.bodyText}>{c.articleText || "Подробный разбор скоро появится."}</Text>
      </View>
      {c.articleUrl ? (
        <Pressable onPress={() => Linking.openURL(c.articleUrl!)} style={styles.linkBtn}>
          <Ionicons name="open-outline" size={16} color={colors.plum} />
          <Text style={styles.linkText}>Полная статья</Text>
        </Pressable>
      ) : null}
    </Wrap>
  );
}

function Wrap({ children, onBack, backLabel = "Назад" }: { children: React.ReactNode; onBack: () => void; backLabel?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.paper }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
          <Ionicons name="arrow-back" size={16} color={colors.plum} />
          <Text style={styles.backText}>{backLabel}</Text>
        </Pressable>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: 2 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: space.sm, alignSelf: "flex-start" },
  backText: { color: colors.plum, fontSize: 14, fontWeight: "600" },
  kicker: { fontSize: 11, fontWeight: "700", color: colors.orange, textTransform: "uppercase", letterSpacing: 1 },
  h1: { fontSize: 20, fontWeight: "800", color: colors.plumDeep, marginTop: 4, marginBottom: space.md },
  muted: { fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 4 },
  textCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.sm },
  bodyText: { fontSize: 14, color: colors.ink, lineHeight: 21 },
  qText: { fontSize: 15, fontWeight: "700", color: colors.plumDeep, marginBottom: space.sm },
  option: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.sm, borderWidth: 1, marginBottom: space.sm },
  optKey: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  optLabel: { flex: 1, fontSize: 14, color: colors.ink },
  err: { color: colors.orange, fontWeight: "600", fontSize: 13, marginTop: space.sm },
  scoreWrap: { alignItems: "center", gap: space.sm, marginVertical: space.lg },
  scoreCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,81,0,0.10)", alignItems: "center", justifyContent: "center" },
  scoreText: { fontSize: 22, fontWeight: "800", color: colors.orange },
  resCard: { borderRadius: radius.md, borderWidth: 1, padding: space.md, marginBottom: space.sm },
  resHead: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  resQ: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.plumDeep },
  resExp: { fontSize: 13, color: colors.ink, marginTop: 6, marginLeft: 26, lineHeight: 19 },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 13, marginTop: space.md },
  linkText: { color: colors.plum, fontWeight: "700", fontSize: 14 },
});
