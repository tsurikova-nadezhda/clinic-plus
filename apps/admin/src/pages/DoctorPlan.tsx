import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Plan, Quarter, Task } from "@clinic-plus/shared";
import { Card, Field, Toast, Loading, Badge } from "../components/ui";

const TASK_TYPES: Task["type"][] = ["course", "book", "media", "practice"];
const QUARTERS: Quarter["q"][] = ["Q1", "Q2", "Q3", "Q4"];

function genId() {
  return "t" + Math.random().toString(36).slice(2, 9);
}
function emptyPlan(): Plan {
  return { year: new Date().getFullYear(), mission: "", quarters: [] };
}

export function DoctorPlan() {
  const { userId = "" } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);

  async function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPdfMsg("Загрузка…");
    try {
      const r = await api.uploadPlanPdf(userId, f);
      setPlan((prev) => (prev ? { ...prev, pdfUrl: r.pdfUrl } : prev));
      setPdfMsg("Загружено ✓ — нажмите «Загрузить план врачу», чтобы сохранить.");
    } catch (err) {
      setPdfMsg(err instanceof Error ? err.message : "Ошибка загрузки");
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await api.getPlan(userId);
        setPlan({ year: p.year, mission: p.mission, quarters: p.quarters ?? [], achievements: p.achievements, pdfUrl: p.pdfUrl ?? "" });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setPlan(emptyPlan());
        else setMsg({ kind: "err", text: e instanceof Error ? e.message : "Ошибка" });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading || !plan) return <Loading />;

  function update(p: Partial<Plan>) { setPlan({ ...plan!, ...p }); }
  function updateQuarter(i: number, q: Partial<Quarter>) {
    update({ quarters: plan!.quarters.map((x, idx) => (idx === i ? { ...x, ...q } : x)) });
  }
  function addQuarter() {
    const used = new Set(plan!.quarters.map((q) => q.q));
    const next = QUARTERS.find((q) => !used.has(q)) ?? "Q1";
    update({ quarters: [...plan!.quarters, { q: next, title: "", focus: "", tasks: [] }] });
  }
  function removeQuarter(i: number) {
    update({ quarters: plan!.quarters.filter((_, idx) => idx !== i) });
  }
  function addTask(qi: number) {
    const q = plan!.quarters[qi];
    updateQuarter(qi, { tasks: [...q.tasks, { id: genId(), type: "course", text: "", status: "pending" }] });
  }
  function updateTask(qi: number, ti: number, t: Partial<Task>) {
    const q = plan!.quarters[qi];
    updateQuarter(qi, { tasks: q.tasks.map((x, idx) => (idx === ti ? { ...x, ...t } : x)) });
  }
  function removeTask(qi: number, ti: number) {
    const q = plan!.quarters[qi];
    updateQuarter(qi, { tasks: q.tasks.filter((_, idx) => idx !== ti) });
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed.year !== "number" || typeof parsed.mission !== "string" || !Array.isArray(parsed.quarters)) {
        throw new Error("Нужны поля year (число), mission (строка), quarters (массив).");
      }
      setPlan(parsed);
      setMsg({ kind: "ok", text: "JSON применён к форме. Не забудьте сохранить." });
      setShowJson(false);
    } catch (e) {
      setMsg({ kind: "err", text: "Некорректный JSON: " + (e instanceof Error ? e.message : "") });
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api.putPlan(userId, plan!);
      setMsg({ kind: "ok", text: "План сохранён." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Ошибка сохранения" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link to="/doctors" className="muted">← К списку врачей</Link>
      <h1 style={{ marginTop: 8 }}>Редактор плана</h1>

      <Card>
        <div className="grid2">
          <Field label="Год" value={String(plan.year)} onChange={(v) => update({ year: Number(v) || plan.year })} type="number" />
          <div className="field" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <button className="btn ghost" onClick={() => { setJsonText(JSON.stringify(plan, null, 2)); setShowJson((s) => !s); }}>
              {showJson ? "Скрыть JSON" : "Импорт / экспорт JSON"}
            </button>
          </div>
        </div>
        <Field label="Миссия года" value={plan.mission} onChange={(v) => update({ mission: v })} textarea rows={2} placeholder="Стать экспертом в…" />
        <Field label="Ссылка на PDF плана развития (ИПР)" value={plan.pdfUrl ?? ""} onChange={(v) => update({ pdfUrl: v })} placeholder="https://… или загрузите файл ниже" />
        <div className="field">
          <label>Или загрузить PDF-файл (хранится в Supabase Storage)</label>
          <input type="file" accept="application/pdf" onChange={handlePdf} />
          {pdfMsg ? <p className="muted" style={{ marginTop: 6 }}>{pdfMsg}</p> : null}
        </div>
      </Card>

      {showJson && (
        <Card>
          <label>JSON плана (вставьте, чтобы импортировать)</label>
          <textarea value={jsonText} rows={12} onChange={(e) => setJsonText(e.target.value)} style={{ fontFamily: "monospace", fontSize: 12 }} />
          <button className="btn secondary" style={{ marginTop: 8 }} onClick={applyJson}>Применить JSON к форме</button>
        </Card>
      )}

      {plan.quarters.map((q, qi) => (
        <Card key={qi}>
          <div className="row between">
            <div className="row" style={{ gap: 8 }}>
              <select value={q.q} onChange={(e) => updateQuarter(qi, { q: e.target.value as Quarter["q"] })} style={{ width: 90 }}>
                {QUARTERS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <Badge text={`${q.tasks.length} задач`} color="plum" />
            </div>
            <button className="btn sm ghost" onClick={() => removeQuarter(qi)}>Удалить квартал</button>
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <Field label="Заголовок" value={q.title} onChange={(v) => updateQuarter(qi, { title: v })} />
            <Field label="Фокус" value={q.focus} onChange={(v) => updateQuarter(qi, { focus: v })} />
          </div>

          {q.tasks.map((t, ti) => (
            <div key={t.id} className="row" style={{ gap: 8, marginBottom: 8 }}>
              <select value={t.type} onChange={(e) => updateTask(qi, ti, { type: e.target.value as Task["type"] })} style={{ width: 120 }}>
                {TASK_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <input style={{ flex: 1 }} value={t.text} placeholder="Текст задачи" onChange={(e) => updateTask(qi, ti, { text: e.target.value })} />
              <select value={t.status} onChange={(e) => updateTask(qi, ti, { status: e.target.value as Task["status"] })} style={{ width: 130 }}>
                <option value="pending">не начато</option>
                <option value="in_progress">в процессе</option>
                <option value="done">готово</option>
              </select>
              <button className="btn sm ghost" onClick={() => removeTask(qi, ti)}>✕</button>
            </div>
          ))}
          <button className="btn sm secondary" onClick={() => addTask(qi)}>+ Задача</button>
        </Card>
      ))}

      <button className="btn ghost" onClick={addQuarter}>+ Добавить квартал</button>

      <div style={{ marginTop: 16 }}>
        <Toast msg={msg?.text ?? null} kind={msg?.kind ?? "ok"} />
        <button className="btn" disabled={saving} onClick={save}>{saving ? "Сохранение…" : "Загрузить план врачу"}</button>
      </div>
    </div>
  );
}
