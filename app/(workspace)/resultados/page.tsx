import { redirect } from "next/navigation";
import { requireManager } from "@/lib/auth";

export default async function ManagerResultsPage() {
  const { supabase, profile } = await requireManager();
  if (profile?.role === "admin" || profile?.role === "super_admin") redirect("/admin/resultados");
  const { data: rows } = await supabase.from("admin_assessment_results").select("assessment_id,participante,equipe,status,concluida_em,dominancia,influencia,estabilidade,conformidade,seguranca,disciplina,trabalho_equipe,comunicacao,perfil_predominante")
    .eq("status", "concluida").order("concluida_em", { ascending: false }).limit(100);
  return <><p className="eyebrow">Desenvolvimento da equipe</p><h1 className="page-title">Resultados autorizados</h1><p className="page-subtitle">Somente equipes sob sua gestão e campanhas com visibilidade para gestores. Sem ranking ou classificação de desempenho.</p>
    <section className="surface" style={{ marginTop: 24, overflow: "hidden" }}>{rows?.length ? <div className="table-wrap"><table><thead><tr><th>Participante</th><th>Equipe</th><th>Perfil</th><th>Dominância</th><th>Influência</th><th>Estabilidade</th><th>Conformidade</th></tr></thead><tbody>{rows.map((row) => <tr key={row.assessment_id}><td>{row.participante}</td><td>{row.equipe || "--"}</td><td>{row.perfil_predominante ?? "--"}</td><td>{row.dominancia ?? "--"}</td><td>{row.influencia ?? "--"}</td><td>{row.estabilidade ?? "--"}</td><td>{row.conformidade ?? "--"}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum resultado foi autorizado para sua equipe.</div>}</section>
  </>;
}