import { useState } from "react";
import { Logo } from "../components/Logo";
import { Card, Field, Toast } from "../components/ui";
import { useAuth } from "../lib/auth";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <Card style={{ width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ display: "inline-block" }}><Logo light={false} size={34} /></div>
          <h2 style={{ marginTop: 12 }}>Панель руководителя</h2>
          <p className="muted">Вход только для администратора</p>
        </div>
        <form onSubmit={submit}>
          <Field label="Email" value={email} onChange={setEmail} placeholder="boss@clinic.ru" type="email" />
          <Field label="Пароль" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          <Toast msg={error} kind="err" />
          <button className="btn" style={{ width: "100%", marginTop: 8 }} disabled={busy || !email || !password}>
            {busy ? "Вход…" : "Войти"}
          </button>
        </form>
      </Card>
    </div>
  );
}
