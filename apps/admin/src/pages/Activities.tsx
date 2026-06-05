import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Card, Field, Toast, Loading, Badge } from "../components/ui";

const REMINDER_OPTS = [
  { min: 120, label: "за 2 часа" },
  { min: 5, label: "за 5 минут" },
  { min: 0, label: "в момент начала" },
];

export function Activities() {
  const { data, loading, reload } = useAsync(() => api.activities());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [reminders, setReminders] = useState<number[]>([120, 5, 0]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleReminder(min: number) {
    setReminders((r) => (r.includes(min) ? r.filter((x) => x !== min) : [...r, min].sort((a, b) => b - a)));
  }

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      await api.createActivity({
        title,
        description: description || undefined,
        location: location || undefined,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reminders,
      });
      setMsg({ kind: "ok", text: "Мероприятие создано." });
      setTitle(""); setDescription(""); setLocation(""); setStartsAt(""); setEndsAt("");
      reload();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Ошибка" });
    } finally { setBusy(false); }
  }

  const items = (data?.items ?? []).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  const valid = title.length >= 3 && startsAt && endsAt;

  return (
    <div>
      <h1>Мероприятия</h1>
      <Card>
        <h3>Новое мероприятие</h3>
        <Field label="Название" value={title} onChange={setTitle} placeholder="Конференция по педиатрии" />
        <Field label="Описание" value={description} onChange={setDescription} textarea rows={2} />
        <div className="grid2">
          <Field label="Начало" value={startsAt} onChange={setStartsAt} type="datetime-local" />
          <Field label="Окончание" value={endsAt} onChange={setEndsAt} type="datetime-local" />
        </div>
        <Field label="Место" value={location} onChange={setLocation} placeholder="Конференц-зал №1" />
        <label>Напоминания (push)</label>
        <div className="row" style={{ gap: 16, marginBottom: 12 }}>
          {REMINDER_OPTS.map((o) => (
            <label key={o.min} style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={reminders.includes(o.min)} onChange={() => toggleReminder(o.min)} />
              {o.label}
            </label>
          ))}
        </div>
        <Toast msg={msg?.text ?? null} kind={msg?.kind ?? "ok"} />
        <button className="btn" disabled={busy || !valid} onClick={submit}>{busy ? "Создание…" : "Создать мероприятие"}</button>
      </Card>

      <Card>
        <h3>Список</h3>
        {loading ? <Loading /> : items.length === 0 ? <p className="muted">Пока нет мероприятий.</p> : (
          <table>
            <thead><tr><th>Название</th><th>Начало</th><th>Место</th><th>Напоминания</th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.title}</b></td>
                  <td>{new Date(a.startsAt).toLocaleString("ru-RU")}</td>
                  <td>{a.location ?? "—"}</td>
                  <td>{(a.reminders ?? []).map((m) => <Badge key={m} text={m === 0 ? "в начале" : `за ${m}м`} color="blue" />)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
