import { CheckCircle2, ClipboardList, KeyRound, Users } from "lucide-react";

type Summary = {
  total_people: number;
  passwords_created: number;
  not_started: number;
  in_progress: number;
  completed: number;
};

export function PeopleProgressSummary({ summary }: { summary: Summary }) {
  const total = summary.total_people;
  const percentage = (value: number) => total ? value / total * 100 : 0;
  const cards = [
    { title: "Funcionários no acompanhamento", value: total, icon: Users, color: "#1473E6", description: "Inclui quem ainda não criou conta ou senha." },
    { title: "Senha cadastrada", value: summary.passwords_created, icon: KeyRound, color: "#7C3AED", description: `${total - summary.passwords_created} ainda sem senha cadastrada.` },
    { title: "Fazendo a avaliação", value: summary.in_progress, icon: ClipboardList, color: "#C08000", description: "Iniciaram e ainda não concluíram a avaliação mais recente." },
    { title: "Avaliação concluída", value: summary.completed, icon: CheckCircle2, color: "#0A9F68", description: `${summary.not_started} ainda não iniciaram nenhuma avaliação.` },
  ];
  return <>
    <div className="kpi-grid">{cards.map(({ title, value, icon: Icon, color, description }) => <article className="surface kpi" key={title} style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><span className="kpi-label">{title}</span><Icon size={21} color={color} /></div>
      <p className="kpi-value">{value} <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>de {total}</span></p>
      <div className="report-progress-track" role="progressbar" aria-label={title} aria-valuenow={value} aria-valuemin={0} aria-valuemax={total || 1} aria-valuetext={`${value} de ${total}`}>
        <span style={{ width: `${percentage(value)}%`, background: color }} />
      </div>
      <p style={{ margin: "10px 0 5px", fontSize: 12, fontWeight: 700, color }}>{Math.round(percentage(value))}% do total</p>
      <p className="muted" style={{ margin: 0, fontSize: 11, lineHeight: 1.6 }}>{description}</p>
    </article>)}</div>
    <section className="surface" style={{ padding: 20, marginBottom: 18 }}>
      <p className="eyebrow">Do primeiro acesso ao resultado</p>
      <h2 style={{ fontSize: 18, margin: "5px 0 16px" }}>Andamento da equipe</h2>
      <div style={{ display: "flex", height: 22, borderRadius: 8, overflow: "hidden", background: "var(--line)" }} aria-hidden="true">
        <span style={{ width: `${percentage(summary.not_started)}%`, background: "#94A3B8" }} />
        <span style={{ width: `${percentage(summary.in_progress)}%`, background: "#F59E0B" }} />
        <span style={{ width: `${percentage(summary.completed)}%`, background: "#0A9F68" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 12, fontSize: 12 }}>
        <span>Não iniciaram: <strong>{summary.not_started} de {total}</strong></span>
        <span>Em andamento: <strong>{summary.in_progress} de {total}</strong></span>
        <span>Concluíram: <strong>{summary.completed} de {total}</strong></span>
      </div>
      <p className="muted" style={{ fontSize: 11, marginBottom: 0 }}>Senha cadastrada é uma etapa de acesso e pode coexistir com qualquer status de avaliação. O andamento considera a avaliação mais recente de cada pessoa.</p>
    </section>
  </>;
}
