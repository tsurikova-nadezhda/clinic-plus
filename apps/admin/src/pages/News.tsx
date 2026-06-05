import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Card, Field, Toast, Loading, Badge } from "../components/ui";

export function News() {
  const { data, loading, reload } = useAsync(() => api.news());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      await api.createNews({ title, content, source: source || undefined, publishedAt });
      setMsg({ kind: "ok", text: "Новость опубликована." });
      setTitle(""); setContent(""); setSource("");
      reload();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Ошибка" });
    } finally { setBusy(false); }
  }

  const items = (data?.items ?? []).sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const valid = title.length >= 3 && content.length >= 10;

  return (
    <div>
      <h1>Новости</h1>
      <Card>
        <h3>Опубликовать новость</h3>
        <Field label="Заголовок" value={title} onChange={setTitle} placeholder="Новые рекомендации ВОЗ" />
        <Field label="Текст" value={content} onChange={setContent} textarea rows={4} placeholder="Краткое содержание…" />
        <div className="grid2">
          <Field label="Источник" value={source} onChange={setSource} placeholder="WHO" />
          <Field label="Дата публикации" value={publishedAt} onChange={setPublishedAt} type="date" />
        </div>
        <Toast msg={msg?.text ?? null} kind={msg?.kind ?? "ok"} />
        <button className="btn" disabled={busy || !valid} onClick={submit}>{busy ? "Публикация…" : "Опубликовать"}</button>
      </Card>

      <Card>
        <h3>Лента</h3>
        {loading ? <Loading /> : items.length === 0 ? <p className="muted">Новостей пока нет.</p> : (
          items.map((n) => (
            <div key={n.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div className="row between">
                <b>{n.title}</b>
                <span className="muted">{new Date(n.publishedAt).toLocaleDateString("ru-RU")}</span>
              </div>
              {n.source ? <Badge text={n.source} color="blue" /> : null}
              <p style={{ margin: "6px 0 0" }}>{n.content}</p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
