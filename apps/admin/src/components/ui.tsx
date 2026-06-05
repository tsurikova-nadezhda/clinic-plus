import type { ReactNode } from "react";

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={style}>{children}</div>;
}

export function Field({
  label, value, onChange, placeholder, type = "text", textarea, rows,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; textarea?: boolean; rows?: number;
}) {
  return (
    <div className="field">
      {label ? <label>{label}</label> : null}
      {textarea ? (
        <textarea value={value} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function Badge({ text, color = "plum" }: { text: string; color?: "green" | "orange" | "plum" | "blue" }) {
  return <span className={`badge ${color}`}>{text}</span>;
}

export function Progress({ pct }: { pct: number }) {
  return <div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}

export function Loading() {
  return <p className="muted">Загрузка…</p>;
}

export function Toast({ msg, kind }: { msg: string | null; kind: "ok" | "err" }) {
  if (!msg) return null;
  return <p className={kind === "ok" ? "ok" : "err"}>{msg}</p>;
}
