import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Eye, FileQuestion, Percent, Users, UsersRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { PersonalAssessmentCard } from "@/components/assessment/PersonalAssessmentCard";

export default async function AdminDashboard() {
  const { supabase, user } = await requireAdmin();
  const [{ data: profiles }, { data: teams }, { data: questionnaires }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("role,status"),
    supabase.from("teams").select("id,name"),
    supabase.from("questionnaires").select("id,status"),
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
    { label: "Avaliações iniciadas", value: assessments.length, icon: ClipboardCheck },
    { label: "Avaliações concluídas", value: complete.length, icon: ClipboardCheck },
    { label: "Taxa de conclusão", value: `${rate}%`, icon: Percent },
  ];
  const teamChart = [...teamCounts].map(([name, total]) => ({ name, total }));
  const discChart = [...profilesCounts].map(([name, total]) => ({ name, total }));
  return <>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}><div><p className="eyebrow">Command center administrativo</p><h1 className="page-title">Visão geral</h1><p className="page-subtitle">Operação, participação e desenvolvimento em um só lugar.</p></div><div className="admin-dashboard-actions"><Link href="/admin/visualizar?como=participante" className="button-secondary"><Eye size={15} /> Ver como participante</Link><Link href="/admin/visualizar?como=jossimar" className="button-secondary"><Eye size={15} /> Ver como Jossimar</Link><Link href="/admin/pessoas" className="button-primary">Acompanhar pessoas <ArrowUpRight size={15} /></Link></div></div>
    <PersonalAssessmentCard supabase={supabase} userId={user.id} />
    <div className="kpi-grid">{cards.map(({ label, value, icon: Icon }) => <article key={label} className="surface kpi"><div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}><span className="kpi-label">{label}</span><Icon size={16} color="var(--blue)" /></div><p className="kpi-value">{value}</p></article>)}</div>
    <DashboardCharts byTeam={teamChart} discProfiles={discChart} />
    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}><div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: 13 }}>Atividade recente</strong><Link href="/admin/resultados" style={{ color: "var(--blue)", fontSize: 11 }}>Ver resultados <ArrowUpRight size={12} style={{ verticalAlign: "middle" }} /></Link></div>{assessments.length ? <div className="table-wrap"><table><thead><tr><th>Equipe</th><th>Status</th><th>Conclusão</th><th>Perfil</th></tr></thead><tbody>{assessments.slice(0, 12).map((row) => <tr key={row.assessment_id}><td>{row.equipe || "Sem equipe"}</td><td><span className="status">{row.status.replace("_", " ")}</span></td><td>{row.concluida_em ? new Date(row.concluida_em).toLocaleDateString("pt-BR") : "--"}</td><td>{row.perfil_predominante ?? "--"}</td></tr>)}</tbody></table></div> : <div className="empty-state">Ainda não há avaliações registradas.</div>}</section>
  </>;
}