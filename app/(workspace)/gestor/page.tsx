import Link from "next/link";
import { ArrowRight, ClipboardCheck, UsersRound } from "lucide-react";
import { requireManager } from "@/lib/auth";

export default async function ManagerDashboard() {
  const { supabase, user } = await requireManager();
  const now = new Date().toISOString();
  const { data: assignments } = await supabase.from("manager_team_assignments").select("team_id")
    .eq("manager_id", user.id).eq("active", true).lte("valid_from", now).or(`valid_until.is.null,valid_until.gt.${now}`);
  const teamIds = [...new Set((assignments ?? []).map((assignment) => assignment.team_id))];
  const [{ data: teams }, { data: memberships }] = teamIds.length ? await Promise.all([
    supabase.from("teams").select("id,name").in("id", teamIds),
    supabase.from("team_members").select("user_id,team_id").in("team_id", teamIds).eq("active", true),
  ]) : [{ data: [] }, { data: [] }];
  const userIds = [...new Set((memberships ?? []).map((member) => member.user_id))];
  const { data: assessments } = userIds.length ? await supabase.from("assessments").select("user_id,status").in("user_id", userIds) : { data: [] };
  const rows = assessments ?? [];
  const completed = rows.filter((item) => item.status === "concluida").length;
  const inProgress = rows.filter((item) => item.status === "em_andamento" || item.status === "iniciada").length;
  const peopleCount = userIds.length;
  const participation = peopleCount ? Math.round((new Set(rows.map((item) => item.user_id)).size / peopleCount) * 100) : 0;
  const metrics = [{ label: "Integrantes", value: peopleCount }, { label: "Pendentes", value: Math.max(peopleCount - rows.length, 0) }, { label: "Em andamento", value: inProgress }, { label: "Concluídas", value: completed }, { label: "Participação", value: `${participation}%` }];
  return <>
    <p className="eyebrow">Painel da equipe</p><h1 className="page-title">Visão geral</h1><p className="page-subtitle">Acompanhamento de participação nas equipes sob sua gestão.</p>
    <div className="kpi-grid">{metrics.map((metric) => <article key={metric.label} className="surface kpi"><span className="kpi-label">{metric.label}</span><p className="kpi-value">{metric.value}</p></article>)}</div>
    <section className="surface" style={{ padding: 20 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><p className="eyebrow">Escopo autorizado</p><h2 style={{ fontSize: 18, margin: "6px 0" }}>Equipes vinculadas</h2></div><UsersRound color="var(--blue)" /></div>
      {(teams ?? []).length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 12 }}>{teams?.map((team) => <span className="status" key={team.id}>{team.name}</span>)}</div> : <p className="muted" style={{ fontSize: 12 }}>Nenhuma equipe foi vinculada ao seu perfil.</p>}
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 20 }}><Link href="/gestor/equipe" className="button-primary">Ver integrantes <ArrowRight size={15} /></Link><Link href="/campanhas" className="button-secondary"><ClipboardCheck size={15} /> Campanhas</Link></div>
    </section>
    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}><div style={{ padding: "16px 19px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Status de avaliações</strong></div>{rows.length ? <div className="table-wrap"><table><thead><tr><th>Status</th><th>Quantidade</th></tr></thead><tbody>{["iniciada", "em_andamento", "concluida"].map((status) => <tr key={status}><td>{status.replace("_", " ")}</td><td>{rows.filter((row) => row.status === status).length}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhuma avaliação associada às equipes no momento.</div>}</section>
  </>;
}