import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { Card, Loading, Toast, Badge } from "../components/ui";

export function Stats() {
  const { data, loading, error } = useAsync(() => api.submissions());
  const items = (data?.items ?? []).sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));

  return (
    <div>
      <h1>Статистика</h1>
      <p className="muted">Кто какие клинические задачи прошёл и с каким результатом.</p>
      <Card>
        <Toast msg={error} kind="err" />
        {loading ? <Loading /> : items.length === 0 ? <p className="muted">Пока никто не прошёл ни одной задачи.</p> : (
          <table>
            <thead><tr><th>Врач</th><th>Задача</th><th>Результат</th><th>Дата</th></tr></thead>
            <tbody>
              {items.map((s) => {
                const pct = s.total ? Math.round((s.score / s.total) * 100) : 0;
                return (
                  <tr key={s.id}>
                    <td><b>{s.userName}</b></td>
                    <td>{s.caseTitle}</td>
                    <td>
                      {s.score} / {s.total}{" "}
                      <Badge text={`${pct}%`} color={pct >= 60 ? "green" : "orange"} />
                    </td>
                    <td className="muted">{s.submittedAt ? new Date(s.submittedAt).toLocaleString("ru-RU") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
