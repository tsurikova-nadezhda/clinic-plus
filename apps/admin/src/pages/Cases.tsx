import { useState } from "react";
import { api } from "../lib/api";
import type { CaseCreate } from "@clinic-plus/shared";
import { useAsync } from "../lib/hooks";
import { Card, Field, Toast, Loading, Badge } from "../components/ui";

const KEYS = ["A", "B", "C", "D", "E"];

interface QDraft {
  id: string;
  text: string;
  options: { key: string; label: string }[];
  correctAnswer: string;
  explanation: string;
}

function newQuestion(n: number): QDraft {
  return {
    id: `q${n}`,
    text: "",
    options: [{ key: "A", label: "" }, { key: "B", label: "" }],
    correctAnswer: "A",
    explanation: "",
  };
}

export function Cases() {
  const { data, loading, reload } = useAsync(() => api.cases());
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [scenario, setScenario] = useState("");
  const [articleUrl, setArticleUrl] = useState("");
  const [articleText, setArticleText] = useState("");
  const [questions, setQuestions] = useState<QDraft[]>([newQuestion(1)]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function updateQ(i: number, patch: Partial<QDraft>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function addOption(qi: number) {
    setQuestions((qs) => qs.map((q, idx) => {
      if (idx !== qi || q.options.length >= KEYS.length) return q;
      return { ...q, options: [...q.options, { key: KEYS[q.options.length], label: "" }] };
    }));
  }
  function updateOption(qi: number, oi: number, label: string) {
    setQuestions((qs) => qs.map((q, idx) =>
      idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, label } : o)) } : q,
    ));
  }

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      const payload: CaseCreate = {
        title,
        specialty: specialty || undefined,
        scenario,
        questions: questions.map((q) => ({
          id: q.id, text: q.text, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation,
        })),
        articleUrl: articleUrl || undefined,
        articleText: articleText || undefined,
      };
      await api.createCase(payload);
      setMsg({ kind: "ok", text: "Клиническая задача создана." });
      setTitle(""); setSpecialty(""); setScenario(""); setArticleUrl(""); setArticleText("");
      setQuestions([newQuestion(1)]);
      reload();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Ошибка" });
    } finally { setBusy(false); }
  }

  const valid =
    title.length >= 3 && scenario.length >= 5 &&
    questions.every((q) => q.text && q.options.every((o) => o.label));

  const items = data?.items ?? [];

  return (
    <div>
      <h1>Клинические задачи</h1>
      <Card>
        <h3>Новая задача</h3>
        <div className="grid2">
          <Field label="Название" value={title} onChange={setTitle} placeholder="Острый живот у ребёнка" />
          <Field label="Специальность" value={specialty} onChange={setSpecialty} placeholder="Педиатрия" />
        </div>
        <Field label="Сценарий" value={scenario} onChange={setScenario} textarea rows={3} placeholder="Описание клинической ситуации…" />

        {questions.map((q, qi) => (
          <Card key={qi} style={{ background: "var(--paper)" }}>
            <div className="row between">
              <b>Вопрос {qi + 1}</b>
              {questions.length > 1 ? (
                <button className="btn sm ghost" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))}>Удалить</button>
              ) : null}
            </div>
            <Field label="Текст вопроса" value={q.text} onChange={(v) => updateQ(qi, { text: v })} />
            {q.options.map((o, oi) => (
              <div key={o.key} className="row" style={{ gap: 8, marginBottom: 6 }}>
                <Badge text={o.key} color="plum" />
                <input style={{ flex: 1 }} value={o.label} placeholder={`Вариант ${o.key}`} onChange={(e) => updateOption(qi, oi, e.target.value)} />
                <label style={{ display: "flex", alignItems: "center", gap: 4, margin: 0 }}>
                  <input type="radio" style={{ width: "auto" }} checked={q.correctAnswer === o.key} onChange={() => updateQ(qi, { correctAnswer: o.key })} />
                  верный
                </label>
              </div>
            ))}
            {q.options.length < KEYS.length ? (
              <button className="btn sm ghost" onClick={() => addOption(qi)}>+ Вариант</button>
            ) : null}
            <Field label="Пояснение (показывается после ответа)" value={q.explanation} onChange={(v) => updateQ(qi, { explanation: v })} textarea rows={2} />
          </Card>
        ))}
        <button className="btn ghost" onClick={() => setQuestions((qs) => [...qs, newQuestion(qs.length + 1)])}>+ Вопрос</button>

        <div className="grid2" style={{ marginTop: 12 }}>
          <Field label="Ссылка на статью-разбор" value={articleUrl} onChange={setArticleUrl} placeholder="https://…" />
          <div />
        </div>
        <Field label="Текст статьи (опционально)" value={articleText} onChange={setArticleText} textarea rows={3} />

        <Toast msg={msg?.text ?? null} kind={msg?.kind ?? "ok"} />
        <button className="btn" disabled={busy || !valid} onClick={submit}>{busy ? "Создание…" : "Создать задачу"}</button>
      </Card>

      <Card>
        <h3>Опубликованные задачи</h3>
        {loading ? <Loading /> : items.length === 0 ? <p className="muted">Задач пока нет.</p> : (
          <table>
            <thead><tr><th>Название</th><th>Специальность</th><th>Вопросов</th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.title}</b></td>
                  <td>{c.specialty ?? "—"}</td>
                  <td>{c.questions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
