import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";
import type { loadAssessmentReport } from "@/lib/assessment-report";
import { ResponseExportButtons } from "@/components/results/ResponseExportButtons";

type Report = NonNullable<Awaited<ReturnType<typeof loadAssessmentReport>>>;

const categoryColors = {
  "Ponto consolidado": { color: "#0A9F68", background: "#E9F8F2" },
  "Em desenvolvimento": { color: "#1473E6", background: "#EAF3FF" },
  "Prioridade sugerida": { color: "#B77900", background: "#FFF7D9" },
};

function displayDate(value: string | null) {
  if (!value) return "Data indisponível";
  return new Date(value).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function scoreRing(value: number) {
  const circumference = 2 * Math.PI * 45;
  return Math.max(0, Math.min(100, value)) / 100 * circumference;
}

export function AssessmentResultDashboard({ report }: { report: Report }) {
  const percentage = report.overall === null ? 0 : Math.max(0, Math.min(100, Math.round(report.overall)));
  const categories = [
    { title: "Pontos consolidados", key: "Ponto consolidado" as const, icon: CheckCircle2 },
    { title: "Em desenvolvimento", key: "Em desenvolvimento" as const, icon: TrendingUp },
    { title: "Prioridade sugerida", key: "Prioridade sugerida" as const, icon: Target },
  ];
  const selectedCodes = report.profile.codes.join("/");
  const displayProfileName = report.profile.name || "Perfil em análise";

  return <div className="assessment-report printable-report">
    <header className="assessment-report-header">
      <div className="assessment-report-heading">
        <div className="assessment-complete-mark" aria-hidden="true"><CheckCircle2 size={26} /></div>
        <div>
          <p className="eyebrow">Avaliação concluída</p>
          <h1 className="page-title">{report.viewerIsOwner ? "Seu resultado está pronto!" : `Resultado de ${report.participantName}`}</h1>
          <p className="page-subtitle">Confira o perfil, as competências e as respostas registradas nesta avaliação.</p>
          <div className="report-identity">
            <div>
              <strong>{report.participantName}</strong>
              <span>{report.viewerIsOwner ? "Concluiu sua avaliação" : [report.teamName, report.roleName].filter(Boolean).join(" · ") || "Avaliação concluída"}</span>
            </div>
            <ResponseExportButtons participantName={report.participantName} responses={report.responses} />
          </div>
        </div>
      </div>
      <div className="report-date">
        <span>Concluída em</span>
        <strong>{displayDate(report.completedAt)}</strong>
      </div>
    </header>

    <section className="report-summary-grid" aria-label="Resumo dos resultados">
      <article className="surface report-card report-profile-card">
        <p className="report-card-title">Seu perfil predominante</p>
        {report.standardResult ? <>
          <div className="report-profile">
            <div className="report-profile-code" style={{ background: report.profile.color }}>{selectedCodes || "—"}</div>
            <div>
              <h2>{displayProfileName}</h2>
              {selectedCodes && <p className="muted">{selectedCodes.length > 1 ? "Combinação dos perfis com a maior pontuação" : `Perfil ${selectedCodes}`}</p>}
            </div>
          </div>
          <p className="report-profile-description">{report.profile.description}</p>
          <div className="report-traits">{report.profile.traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
        </> : <div className="report-profile-description">Este questionário não utiliza o cálculo DISC.</div>}
      </article>

      <article className="surface report-card">
        <p className="report-card-title">{report.standardResult ? "Distribuição DISC" : "Dimensões avaliadas"}</p>
        {report.standardResult ? <div className="report-disc-list">{report.discScores.map((item) => (
          <div className="report-disc-row" key={item.code}>
            <span className="report-disc-code" style={{ background: item.color }}>{item.code}</span>
            <span className="report-disc-name">{item.name}</span>
            <div className="report-progress-track" role="progressbar" aria-label={`${item.name}: ${item.percentage}%`} aria-valuenow={item.percentage} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${item.percentage}%`, background: item.color }} />
            </div>
            <strong className="report-disc-value">{item.percentage}%</strong>
            {typeof item.band === "string" && <span className="report-disc-band">{item.band}</span>}
          </div>
        ))}</div> : <div className="report-disc-list">{report.customDimensions.map((item) => (
          <div className="report-custom-dimension" key={item.code}><span>{item.name}</span><strong>{item.value}</strong></div>
        ))}</div>}
      </article>

      <article className="surface report-card report-index-card">
        <p className="report-card-title">Índice geral de competências</p>
        <div className="report-index-content">
          <div className="report-score-ring" role="img" aria-label={`Índice geral ${percentage} por cento`}>
            <svg viewBox="0 0 110 110" aria-hidden="true">
              <circle cx="55" cy="55" r="45" className="report-ring-track" />
              <circle cx="55" cy="55" r="45" className="report-ring-value" strokeDasharray={`${scoreRing(percentage)} 283`} />
            </svg>
            <div><strong>{report.overall === null ? "—" : `${percentage}%`}</strong><span>{report.classification ?? "Resultado"}</span></div>
          </div>
          <div className="report-index-copy">
            <p>Resultado calculado a partir das competências respondidas, conforme os critérios da avaliação.</p>
            {report.weightedScore !== null && <div className="report-weighted-score"><span>Índice ponderado</span><strong>{Number(report.weightedScore).toFixed(1)}%</strong></div>}
          </div>
        </div>
      </article>
    </section>

    {report.competencies.length > 0 && <>
      <section className="report-section">
        <div className="report-section-heading"><div><p className="eyebrow">Resultado individual</p><h2>Competências operacionais</h2></div><ClipboardCheck size={21} color="var(--blue)" /></div>
        <div className="report-competency-grid">{report.competencies.map((item) => {
          const colors = categoryColors[item.classification];
          return <article className="surface report-competency-card" key={item.code}>
            <div className="report-competency-top"><span className="report-competency-icon"><Target size={17} /></span><span className="report-competency-score">{item.percentage}%</span></div>
            <h3>{item.name}</h3>
            <div className="report-progress-track report-competency-track" role="progressbar" aria-label={`${item.name}: ${item.percentage}%`} aria-valuenow={item.percentage} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${item.percentage}%`, background: "var(--blue)" }} />
            </div>
            <p>{item.description}</p>
            <span className="report-classification" style={{ color: colors.color, background: colors.background }}>{item.classification}</span>
          </article>;
        })}</div>
      </section>

      <section className="report-development-grid">
        <article className="surface report-development-card">
          <div className="report-section-heading"><div><p className="eyebrow">Visão prática</p><h2>Mapa de desenvolvimento</h2></div><TrendingUp size={21} color="var(--blue)" /></div>
          <div className="report-development-columns">{categories.map(({ title, key, icon: Icon }) => {
            const items = report.competencies.filter((item) => item.classification === key);
            const colors = categoryColors[key];
            return <section className="report-development-column" key={key}>
              <h3 style={{ color: colors.color }}><Icon size={16} />{title}</h3>
              {items.length ? <ul>{items.map((item) => <li key={item.code}><span>{item.name}</span><strong>{item.percentage}%</strong></li>)}</ul> : <p className="muted">Nenhuma competência nesta faixa.</p>}
            </section>;
          })}</div>
          <p className="report-method-note">Faixas do mapa seguem os intervalos de classificação apresentados na planilha de referência.</p>
        </article>

        <article className="surface report-recommendation-card">
          <div className="report-section-heading"><div><p className="eyebrow">Próximos passos</p><h2>Recomendação para desenvolvimento</h2></div><Lightbulb size={21} color="#B77900" /></div>
          <div className="report-recommendation"><Target size={20} /><div><strong>{selectedCodes ? `Foco recomendado · ${displayProfileName}` : "Plano de desenvolvimento"}</strong><p>{report.profile.recommendation}</p></div></div>
          <p className="report-development-copy">Use este resultado como apoio para conversas de desenvolvimento e planejamento de ações no contexto de trabalho.</p>
        </article>
      </section>
    </>}

    <section className="surface report-responses-card">
      <div className="report-section-heading">
        <div><p className="eyebrow">Registro da avaliação</p><h2>Respostas de {report.participantName}</h2></div>
        <BookOpen size={21} color="var(--blue)" />
      </div>
      {report.responses.length ? <div className="report-responses-table-wrap"><table className="report-responses-table">
        <thead><tr><th>#</th><th>Seção</th><th>Pergunta</th><th>Resposta</th></tr></thead>
        <tbody>{report.responses.map((item) => <tr key={`${item.number}-${item.question}`}><td>{item.number}</td><td>{item.section}</td><td>{item.question}</td><td>{item.response}</td></tr>)}</tbody>
      </table></div> : <p className="empty-state">Não há respostas disponíveis para esta avaliação.</p>}
    </section>

    <nav className="report-navigation no-print" aria-label="Navegação do resultado">
      <Link href={report.viewerIsOwner ? "/painel" : "/resultados"} className="button-secondary"><ArrowLeft size={15} /> Voltar</Link>
      {report.viewerIsOwner && <Link href="/historico" className="button-primary">Ver histórico <ArrowRight size={15} /></Link>}
    </nav>
  </div>;
}
