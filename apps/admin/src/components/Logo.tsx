/** Логотип ПЛЮС (SPEC §4): П green, Л yellow, Ю+ orange, С blue. */
const L = {
  П: "var(--green)",
  Л: "var(--yellow)",
  Ю: "var(--orange)",
  "+": "var(--orange)",
  С: "var(--blue)",
} as const;

export function Logo({ size = 28, light = true }: { size?: number; light?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: light ? "var(--yellow)" : "var(--plum)", letterSpacing: 0.5 }}>
        детская клиника
      </div>
      <div style={{ display: "flex" }}>
        {(["П", "Л", "Ю", "+", "С"] as const).map((ch, i) => (
          <span key={i} style={{ color: L[ch], fontSize: size, fontWeight: 900, letterSpacing: 1, lineHeight: 1 }}>
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}
