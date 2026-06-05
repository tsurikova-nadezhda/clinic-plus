import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Button, Loading, Empty, Badge, SectionTitle } from "../../components/ui";
import { api, ApiError, type ClinicalCase, type CaseResult } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { colors, space, typography, radius } from "../../lib/theme";

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useAsync<ClinicalCase | null>(async () => {
    const all = await api.cases();
    return all.items.find((c) => c.id === id) ?? null;
  }, [id]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CaseResult | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (!data) return <Screen><Empty text="Случай не найден." /></Screen>;

  const c = data;
  const allAnswered = c.questions.every((q) => answers[q.id]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.submitCase(c.id, answers);
      setResult(r);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setAlreadyDone(true);
      else setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setBusy(false);
    }
  }

  // ── Уже пройдено ранее (одна попытка, §6.4) ──
  if (alreadyDone) {
    return (
      <Screen>
        <Card>
          <Ionicons name="checkmark-done-circle" size={40} color={colors.green} />
          <Text style={typography.h2}>Этот случай уже пройден</Text>
          <Text style={typography.body}>На каждый клинический случай — одна попытка. Ваш результат сохранён.</Text>
          {c.articleUrl ? <ArticleButton url={c.articleUrl} /> : null}
          {c.articleText ? <Text style={typography.body}>{c.articleText}</Text> : null}
        </Card>
      </Screen>
    );
  }

  // ── Результат ──
  if (result) {
    return (
      <Screen>
        <Card style={{ alignItems: "center" }}>
          <Text style={styles.scoreBig}>{result.score} / {c.questions.length}</Text>
          <Text style={typography.muted}>правильных ответов</Text>
        </Card>

        <SectionTitle>Разбор</SectionTitle>
        {c.questions.map((q, idx) => {
          const ok = result.correct[q.id];
          const chosen = answers[q.id];
          return (
            <Card key={q.id}>
              <View style={styles.qHead}>
                <Ionicons name={ok ? "checkmark-circle" : "close-circle"} size={20} color={ok ? colors.green : colors.orange} />
                <Text style={[typography.h3, { flex: 1 }]}>{idx + 1}. {q.text}</Text>
              </View>
              {q.options.map((o) => (
                <Text key={o.key} style={[typography.body, o.key === chosen && { fontWeight: "700", color: ok ? colors.green : colors.orange }]}>
                  {o.key}. {o.label}{o.key === chosen ? "  ← ваш ответ" : ""}
                </Text>
              ))}
              {result.explanations[q.id] ? (
                <Text style={styles.explain}>{result.explanations[q.id]}</Text>
              ) : null}
            </Card>
          );
        })}

        {result.articleUrl ? <ArticleButton url={result.articleUrl} /> : null}
        {c.articleText ? (
          <Card>
            <SectionTitle>Статья</SectionTitle>
            <Text style={typography.body}>{c.articleText}</Text>
          </Card>
        ) : null}
      </Screen>
    );
  }

  // ── Прохождение теста ──
  return (
    <Screen>
      <Card>
        <Text style={typography.h2}>{c.title}</Text>
        {c.specialty ? <Badge text={c.specialty} color={colors.plum} /> : null}
        <Text style={typography.body}>{c.scenario}</Text>
      </Card>

      {c.questions.map((q, idx) => (
        <Card key={q.id}>
          <Text style={typography.h3}>{idx + 1}. {q.text}</Text>
          {q.options.map((o) => {
            const selected = answers[q.id] === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Ionicons
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selected ? colors.orange : colors.muted}
                />
                <Text style={[typography.body, { flex: 1 }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </Card>
      ))}

      {error ? <Text style={{ color: colors.orange, fontWeight: "600" }}>{error}</Text> : null}
      <Button title="Отправить ответы" onPress={submit} loading={busy} disabled={!allAnswered} />
      {!allAnswered ? <Text style={typography.muted}>Ответьте на все вопросы, чтобы отправить.</Text> : null}
    </Screen>
  );
}

function ArticleButton({ url }: { url: string }) {
  return <Button title="Открыть статью-разбор" variant="secondary" onPress={() => Linking.openURL(url)} />;
}

const styles = StyleSheet.create({
  scoreBig: { fontSize: 44, fontWeight: "900", color: colors.plum },
  qHead: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  explain: {
    ...typography.body, backgroundColor: "#f4f0fa", padding: space.md,
    borderRadius: radius.sm, color: colors.ink, marginTop: space.xs,
  },
  option: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.sm,
    borderWidth: 1, borderColor: "#e7e0ee", marginTop: space.xs,
  },
  optionSelected: { borderColor: colors.orange, backgroundColor: "#fff3ee" },
});
