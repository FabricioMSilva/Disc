import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { Json } from "@/lib/database.types";

function getDiscBand(value: Json | null, code: string | null) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !code) return null;
  const band = value[code];
  return typeof band === "string" ? band : null;
}

const dimensions = [
  ["dominancia", "Dominância"], ["influencia", "Influência"], ["estabilidade", "Estabilidade"], ["conformidade", "Conformidade"],
  ["seguranca", "Segurança"], ["disciplina", "Disciplina Operacional"], ["trabalho_equipe", "Trabalho em Equipe"], ["comunicacao", "Comunicação"],
] as const;

export default async function AdminResultsPage({ searchParams }: { searchParams: Promise<{ equipe?: string; status?: string; inicio?: string; fim?: string }> }) {
  const [{ supabase }, params] = await Promise.all([requireAdmin(), searchParams]);
  let query = supabase.from("admin_assessment_results").select("*", { count: "exact" }).order("iniciada_em", { ascending: false });
  if (params.equipe) query = query.eq("equipe", params.equipe);
  if (["iniciada", "em_andamento", "concluida", "cancelada"].includes(params.status ?? "")) query = query.eq("status", params.status!);
  if (params.inicio && !Number.isNaN(Date.parse(params.inicio))) query = query.gte("iniciada_em", new Date(params.inicio).toISOString());
  if (params.fim && !Number.isNaN(Date.parse(params.fim))) query = query.lte("iniciada_em", new Date(`${params.fim}T23:59:59`).toISOString());
  const [{ data: rows, count }, { data: teamProgress, error: progressError }] = await Promise.all([
    query.range(0, 99),
    supabase.rpc("team_assessment_progress", { p_team_id: null }),
  ]);
  if (progressError) throw new Error(`Não foi possível carregar o progresso das equipes: ${progressError.message}`);
  const results = rows ?? [];
  const progressRows = (teamProgress ?? []).filter((row) => !params.equipe || row.team_name === params.equipe);
  const completed = results.filter((row) => row.status === "concluida");
  const averages = dimensions.map(([field, label]) => {
    const values = completed.map((row) => row[field]).filter((value): value is number => value !== null);
    return { label, value: values.length ? (values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(1) : "--" };
  });
  const teams = [...new Set([...results.map((row) => row.equipe), ...(teamProgress ?? []).map((row) => row.team_name)].filter((team): team is string => Boolean(team)))];
  return <>
    <p className="eyebrow">Análise e desenvolvimento</p><h1 className="page-title">Resultados</h1><p className="page-subtitle">Resultados individuais autorizados, sempre apresentados como autopercepção e indicadores de desenvolvimento.</p>
    <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>{averages.map((item) => <div key={item.label} className="surface kpi"><span className="kpi-label">Média · {item.label}</span><p className="kpi-value">{item.value}</p></div>)}</div>
    <form method="get" className="surface" style={{ padding: 14, display: "flex", flexWrap: "wrap", gap: 9, alignItems: "end" }}><div><label className="field-label" htmlFor="team-filter">Equipe</label><select className="field" name="equipe" id="team-filter" defaultValue={params.equipe ?? ""}><option value="">Todas</option>{teams.map((team) => <option key={team} value={team}>{team}</option>)}</select></div><div><label className="field-label" htmlFor="status-filter">Status</label><select className="field" name="status" id="status-filter" defaultValue={params.status ?? ""}><option value="">Todos</option><option value="iniciada">Iniciada</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></select></div><div><label className="field-label" htmlFor="start-filter">De</label><input className="field" type="date" name="inicio" id="start-filter" defaultValue={params.inicio} /></div><div><label className="field-label" htmlFor="end-filter">Até</label><input className="field" type="date" name="fim" id="end-filter" defaultValue={params.fim} /></div><button className="button-primary">Filtrar</button></form>
    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Realização por integrante · {progressRows.length}</strong></div>
      {progressRows.length ? <div className="table-wrap"><table><thead><tr><th>Participante</th><th>Equipe</th><th>Realização</th><th>Status</th><th>Ação</th></tr></thead><tbody>{progressRows.map((row) => {
        const ready = row.completion_percent === 100 && row.status === "concluida" && row.assessment_id;
        return <tr key={`${row.team_id}-${row.user_id}`}>
          <td>{row.participant_name}<div className="muted" style={{ fontSize: 10 }}>{row.matricula || "--"} · {row.funcao || "Sem função"}</div></td>
          <td>{row.team_name}</td>
          <td><div className="progress-cell"><div className="report-progress-track"><span style={{ width: `${row.completion_percent}%`, background: row.completion_percent === 100 ? "var(--green)" : "var(--blue)" }} /></div><strong>{row.completion_percent}%</strong></div></td>
          <td><span className="status">{row.status?.replace("_", " ") ?? "Pendente"}</span></td>
          <td>{ready ? <Link className="button-secondary" href={`/resultados/${row.assessment_id}`}>Entrar</Link> : <span className="muted">Disponível após concluir</span>}</td>
        </tr>;
      })}</tbody></table></div> : <div className="empty-state">Nenhum integrante encontrado para os filtros atuais.</div>}
    </section>
    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}><div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>{count ?? 0} avaliações · exibindo até 100</strong></div>{results.length ? <div className="table-wrap"><table><thead><tr><th>Participante</th><th>Equipe</th><th>Função</th><th>Status</th><th>Perfil DISC</th><th>Índice competências</th><th>Índice ponderado</th><th>Ação recomendada</th><th>Data</th></tr></thead><tbody>{results.map((row) => <tr key={row.assessment_id}><td>{row.participante}<div className="muted" style={{ fontSize: 10 }}>{row.email}</div><Link href={`/resultados/${row.assessment_id}`} style={{ color: "var(--blue)", fontSize: 10, fontWeight: 700 }}>Ver respostas e dashboard</Link></td><td>{row.equipe || "--"}</td><td>{row.funcao || "--"}</td><td><span className="status">{row.status.replace("_", " ")}</span></td><td>{row.perfil_predominante ?? "--"}{getDiscBand(row.faixas_disc, row.perfil_predominante) && <div className="muted" style={{ fontSize: 10 }}>{getDiscBand(row.faixas_disc, row.perfil_predominante)}</div>}</td><td>{row.indice_competencias ?? "--"}{row.classificacao_competencias && <div className="muted" style={{ fontSize: 10 }}>{row.classificacao_competencias}</div>}</td><td>{row.resultado_ponderado === null ? "--" : `${Number(row.resultado_ponderado).toFixed(2)}%`}</td><td>{row.recomendacao ?? "--"}</td><td>{new Date(row.iniciada_em).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum resultado corresponde aos filtros.</div>}</section>
  </>;
}