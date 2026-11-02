import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Eye, FileQuestion, Megaphone, Percent, Users, UsersRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { DashboardCharts } from "@/components/admin/DashboardCharts";

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const [{ data: profiles }, { data: teams }, { data: questionnaires }, { data: campaigns }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("role,status"),
    supabase.from("teams").select("id,name"),
    supabase.from("questionnaires").select("id,status"),
    supabase.from("campaigns").select("id,status,ends_at,name"),
    supabase.from("admin_assessment_results").select("assessment_id,status,equipe,concluida_em,perfil_predominante"),
  ]);
  const people = profiles ?? [];
  const assessments = rows ?? [];
  const complete = assessments.filter((row) => row.status === "concluida");
  const rate = assessments.length ? Math.round((complete.length / assessments.length) * 100) : 0;
  const teamCounts = new Map<string, number>();
  complete.forEach((row) => { const name = row.equipe || "Sem equipe"; teamCounts.set(name, (teamCounts.get(name) ?? 0) + 1); });
  const profilesCounts = new Map<string, number>();
  complete.forEach((row) => { if (row.perfil_predominante) profilesCounts.set(row.perfil_predominante, (profilesCounts.get(row.perfil_predominante) ?? 0) + 1); });
  const cards = [
    { label: "Usuários ativos", value: people.filter((person) => person.status === "active").length, icon: Users },
    { label: "Gestores", value: people.filter((person) => person.role === "manager").length, icon: UsersRound },
    { label: "Equipes", value: teams?.length ?? 0, icon: UsersRound },
    { label: "Questionários publicados", value: questionnaires?.filter((item) => item.status === "published").length ?? 0, icon: FileQuestion },
    { label: "Campanhas ativas", value: campaigns?.filter((item) => item.status === "active").length ?? 0, icon: Megaphone },
    { label: "Avaliações iniciadas", value: assessments.length, icon: ClipboardCheck },
    { label: "Avaliações concluídas", value: complete.length, icon: ClipboardCheck },
    { label: "Taxa de conclusão", value: `${rate}%`, icon: Percent },
  ];
  const teamChart = [...teamCounts].map(([name, total]) => ({ name, total }));
  const discChart = [...profilesCounts].map(([name, total]) => ({ name, total }));
  const expiring = (campaigns ?? []).filter((item) => item.status === "active" && item.ends_at && new Date(item.ends_at).getTime() - Date.now() < 7 * 86400000);
  return <>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}><div><p className="eyebrow">Command center administrativo</p><h1 className="page-title">Visão geral</h1><p className="page-subtitle">Operação, participação e desenvolvimento em um só lugar.</p></div><div className="admin-dashboard-actions"><Link href="/admin/visualizar?como=participante" className="button-secondary"><Eye size={15} /> Ver como participante</Link><Link href="/admin/visualizar?como=jossimar" className="button-secondary"><Eye size={15} /> Ver como Jossimar</Link><Link href="/campanhas" className="button-primary">Nova campanha <ArrowUpRight size={15} /></Link></div></div>
    <div className="kpi-grid">{cards.map(({ label, value, icon: Icon }) => <article key={label} className="surface kpi"><div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}><span className="kpi-label">{label}</span><Icon size={16} color="var(--blue)" /></div><p className="kpi-value">{value}</p></article>)}</div>
    {expiring.length > 0 && <section className="surface" style={{ padding: 16, borderLeft: "3px solid var(--orange)", marginBottom: 14 }}><strong style={{ fontSize: 12 }}>Campanhas próximas do encerramento</strong><p className="muted" style={{ fontSize: 11, margin: "5px 0 0" }}>{expiring.map((item) => item.name).join(" · ")}</p></section>}
    <DashboardCharts byTeam={teamChart} discProfiles={discChart} />
    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}><div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: 13 }}>Atividade recente</strong><Link href="/admin/resultados" style={{ color: "var(--blue)", fontSize: 11 }}>Ver resultados <ArrowUpRight size={12} style={{ verticalAlign: "middle" }} /></Link></div>{assessments.length ? <div className="table-wrap"><table><thead><tr><th>Equipe</th><th>Status</th><th>Conclusão</th><th>Perfil</th></tr></thead><tbody>{assessments.slice(0, 12).map((row) => <tr key={row.assessment_id}><td>{row.equipe || "Sem equipe"}</td><td><span className="status">{row.status.replace("_", " ")}</span></td><td>{row.concluida_em ? new Date(row.concluida_em).toLocaleDateString("pt-BR") : "--"}</td><td>{row.perfil_predominante ?? "--"}</td></tr>)}</tbody></table></div> : <div className="empty-state">Ainda não há avaliações registradas.</div>}</section>
  </>;
}