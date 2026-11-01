import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function AuditPage() {
  const { supabase, profile } = await requireUser();
  if (!profile || !["super_admin", "admin", "auditor"].includes(profile.role)) redirect("/acesso-negado");
  const { data: events } = await supabase.from("audit_logs").select("id,user_id,assessment_id,event_type,metadata,created_at")
    .order("created_at", { ascending: false }).limit(100);
  return <><p className="eyebrow">Governança e rastreabilidade</p><h1 className="page-title">Auditoria</h1><p className="page-subtitle">Eventos técnicos sem conteúdo de respostas pessoais.</p>
    <section className="surface" style={{ marginTop: 24, overflow: "hidden" }}>{events?.length ? <div className="table-wrap"><table><thead><tr><th>Evento</th><th>Ator</th><th>Avaliação</th><th>Metadados</th><th>Data</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.event_type}</td><td>{event.user_id?.slice(0, 8) ?? "Sistema"}</td><td>{event.assessment_id?.slice(0, 8) ?? "--"}</td><td style={{ maxWidth: 280, overflowWrap: "anywhere", color: "var(--muted)" }}>{JSON.stringify(event.metadata)}</td><td>{new Date(event.created_at).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum evento de auditoria registrado.</div>}</section>
  </>;
}