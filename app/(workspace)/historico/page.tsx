import { requireUser } from "@/lib/auth";

export default async function HistoryPage() {
  const { supabase, user } = await requireUser();
  const { data: rows } = await supabase.from("assessments").select("id,status,iniciada_em,concluida_em")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  return <><p className="eyebrow">Meu percurso</p><h1 className="page-title">Histórico autorizado</h1><p className="page-subtitle">Somente suas avaliações e respectivos status.</p>
    <section className="surface" style={{ marginTop: 26, overflow: "hidden" }}>{rows?.length ? <div className="table-wrap"><table><thead><tr><th>Avaliação</th><th>Status</th><th>Iniciada</th><th>Concluída</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>DISC e Competências Operacionais</td><td><span className="status">{row.status.replace("_", " ")}</span></td><td>{new Date(row.iniciada_em).toLocaleDateString("pt-BR")}</td><td>{row.concluida_em ? new Date(row.concluida_em).toLocaleDateString("pt-BR") : "--"}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhuma avaliação iniciada.</div>}</section>
  </>;
}