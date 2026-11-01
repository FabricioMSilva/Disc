"use client";

const options = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] as const;

export function ScaleOptions({ value, onChange, disabled = false }: { value?: number; onChange: (score: number) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Frequência do comportamento" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 9 }}>
      {options.map((label, index) => {
        const score = index + 1;
        const selected = value === score;
        return <button key={label} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange(score)}
          style={{ minHeight: 65, border: `1px solid ${selected ? "var(--blue)" : "var(--line)"}`, borderRadius: 7, background: selected ? "#e8f3ff" : "white", color: selected ? "var(--blue)" : "var(--ink)", fontWeight: selected ? 700 : 500, fontSize: 12, padding: "8px 5px", opacity: disabled ? .65 : 1 }}>
          {label}
        </button>;
      })}
    </div>
  );
}