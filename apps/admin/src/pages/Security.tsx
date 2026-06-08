import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { Card, Field, Toast } from "../components/ui";

export function Security() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null);
    if (next !== confirm) { setMsg({ kind: "err", text: "Новый пароль и подтверждение не совпадают." }); return; }
    if (next.length < 8 || !/\d/.test(next)) { setMsg({ kind: "err", text: "Пароль: минимум 8 символов и хотя бы одна цифра." }); return; }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setMsg({ kind: "ok", text: "Пароль изменён. В следующий раз входите с новым паролем." });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof ApiError && e.status === 401 ? "Текущий пароль неверный." : e instanceof Error ? e.message : "Ошибка" });
    } finally { setBusy(false); }
  }

  return (
    <div>
      <h1>Безопасность</h1>
      <p className="muted">Смена пароля вашего аккаунта руководителя.</p>
      <Card style={{ maxWidth: 460 }}>
        <h3 style={{ marginBottom: 12 }}>Сменить пароль</h3>
        <Field label="Текущий пароль" value={current} onChange={setCurrent} type="password" />
        <Field label="Новый пароль (мин. 8 символов и цифра)" value={next} onChange={setNext} type="password" />
        <Field label="Повторите новый пароль" value={confirm} onChange={setConfirm} type="password" />
        <Toast msg={msg?.text ?? null} kind={msg?.kind ?? "ok"} />
        <button className="btn" disabled={busy || !current || !next} onClick={submit}>
          {busy ? "Сохранение…" : "Сменить пароль"}
        </button>
      </Card>
    </div>
  );
}
