import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Card, Badge, Progress, Loading, Toast } from "../components/ui";

export function Doctors() {
  const { data, loading, error } = useAsync(() => api.doctors());
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const items = (data?.items ?? []).filter((d) =>
    `${d.name} ${d.email} ${d.specialty ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <h1>Врачи</h1>
      <p className="muted">Список врачей подразделения, прогресс плана текущего года.</p>

      <Card>
        <input placeholder="Поиск по имени, email, специальности…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Card>

      <Card>
        <Toast msg={error} kind="err" />
        {loading ? <Loading /> : (
          <table>
            <thead>
              <tr><th>Врач</th><th>Email</th><th>Специальность</th><th style={{ width: 200 }}>Прогресс</th><th></th></tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="muted">Никого не найдено.</td></tr>
              ) : items.map((d) => (
                <tr key={d.id} className="clickable" onClick={() => nav(`/doctors/${d.id}`)}>
                  <td><b>{d.name}</b></td>
                  <td className="muted">{d.email}</td>
                  <td>{d.specialty ?? "—"}</td>
                  <td>
                    {d.hasPlan ? (
                      <div className="row" style={{ gap: 8 }}>
                        <div style={{ flex: 1 }}><Progress pct={d.pct} /></div>
                        <Badge text={`${d.pct}%`} color={d.pct >= 60 ? "green" : "orange"} />
                      </div>
                    ) : <span className="muted">нет плана</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn sm secondary" onClick={(e) => { e.stopPropagation(); nav(`/doctors/${d.id}`); }}>
                      План
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
