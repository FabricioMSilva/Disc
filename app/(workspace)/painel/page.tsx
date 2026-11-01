import Link from "next/link";
import { ArrowRight, CircleCheck, Clock3, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth";

export default async function ParticipantDashboard() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: assessments }, { data: cycles }] = await Promise.all([
    supabase.from("assessments").select("id,status,iniciada_em,concluida_em,cycle_id").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("assessment_cycles").select("id,titulo,descricao,data_fim").eq("ativo", true).order("data_inicio", { ascending: false }),
  ]);
  const rows = assessments ?? [];
  const inProgress = rows.find((item) => item.status === "iniciada" || item.status === "em_andamento");
  const completed = rows.filter((item) => item.status === "concluida").length;
  const activeCycle = cycles?.[0];
  const greetingName = profile?.nome?.split(" ")[0] || user.email?.split("@")[0] || "Olá";
  return <>
    <p className="eyebrow">Meu espaço</p><h1 className="page-title">Olá, {greetingName}</h1><p className="page-subtitle">Acompanhe suas avaliações e seu desenvolvimento.</p>
    <div className="kpi-grid">
      <div className="surface kpi"><span className="kpi-label">Disponíveis</span><p className="kpi-value">{activeCycle ? 1 : 0}</p></div>
      <div className="surface kpi"><span className="kpi-label">Em andamento</span><p className="kpi-value">{inProgress ? 1 : 0}</p></div>
      <div className="surface kpi"><span className="kpi-label">Concluídas</span><p className="kpi-value">{completed}</p></div>
      <div className="surface kpi"><span className="kpi-label">Última atividade</span><p className="kpi-value" style={{ fontSize: 16 }}>{rows[0] ? new Date(rows[0].iniciada_em).toLocaleDateString("pt-BR") : "--"}</p></div>
    </div>
    <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(240px, .8fr)", gap: 14 }}>
      <div className="surface" style={{ padding: 23 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><p className="eyebrow">Sua próxima etapa</p><h2 style={{ margin: "7px 0", fontSize: 21 }}>{inProgress ? "Continue sua avaliação" : activeCycle ? activeCycle.titulo : "Nenhuma avaliação disponível"}</h2><p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>{inProgress ? "Seu progresso foi salvo e você pode continuar de onde parou." : activeCycle?.descricao ?? "Quando uma avaliação for disponibilizada para você, ela aparecerá aqui."}</p></div><div style={{ color: "var(--blue)" }}><FileText size={23} /></div></div>
        {inProgress ? <Link className="button-primary" href="/avaliacao" style={{ marginTop: 13 }}>Continuar avaliação <ArrowRight size={15} /></Link> : activeCycle ? <Link className="button-primary" href="/identificacao" style={{ marginTop: 13 }}>Ver avaliação <ArrowRight size={15} /></Link> : null}
      </div>
      <div className="surface" style={{ padding: 23 }}><p className="eyebrow">Histórico pessoal</p><h2 style={{ margin: "7px 0", fontSize: 19 }}>Seu percurso</h2><p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>Consulte o andamento das suas avaliações. Resultados são apresentados somente quando autorizados.</p><Link href="/historico" className="button-secondary" style={{ marginTop: 12 }}>Ver histórico <Clock3 size={14} /></Link></div>
    </section>
    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}><div style={{ padding: "16px 19px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}><CircleCheck size={17} color="var(--green)" /><strong style={{ fontSize: 13 }}>Atividade recente</strong></div>
      {rows.length ? <div className="table-wrap"><table><thead><tr><th>Avaliação</th><th>Status</th><th>Iniciada em</th><th>Concluída em</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>Autoavaliação DISC</td><td><span className="status">{row.status.replace("_", " ")}</span></td><td>{new Date(row.iniciada_em).toLocaleDateString("pt-BR")}</td><td>{row.concluida_em ? new Date(row.concluida_em).toLocaleDateString("pt-BR") : "--"}</td></tr>)}</tbody></table></div> : <div className="empty-state">Sua atividade aparecerá aqui quando começar uma avaliação.</div>}
    </section>
  </>;
}