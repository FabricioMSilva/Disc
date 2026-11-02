import Link from "next/link";
import { requireTeamManager } from "@/lib/auth";

export default async function ManagerTeamPage() {
  const { supabase } = await requireTeamManager();
  const { data: members, error } = await supabase.rpc("team_assessment_progress", { p_team_id: null });
  if (error) throw new Error(`Não foi possível carregar o progresso da equipe: ${error.message}`);
  const rows = members ?? [];
  return <><p className="eyebrow">Escopo da gestão</p><h1 className="page-title">Minha equipe</h1><p className="page-subtitle">Somente integrantes das equipes vinculadas ao seu perfil.</p>
    <section className="surface" style={{ marginTop: 24, overflow: "hidden" }}>
      {rows.length ? <div className="table-wrap"><table><thead><tr><th>Integrante</th><th>Equipe</th><th>Realização</th><th>Respostas obrigatórias</th><th>Status</th><th>Dashboard</th></tr></thead><tbody>{rows.map((member) => {
        const ready = member.completion_percent === 100 && member.status === "concluida" && member.assessment_id;
        return <tr key={`${member.team_id}-${member.user_id}`}>
          <td>{member.participant_name}<div className="muted" style={{ fontSize: 10 }}>{member.matricula || "--"} · {member.funcao || "Sem função"}</div></td>
          <td>{member.team_name}</td>
          <td><div className="progress-cell"><div className="report-progress-track"><span style={{ width: `${member.completion_percent}%`, background: member.completion_percent === 100 ? "var(--green)" : "var(--blue)" }} /></div><strong>{member.completion_percent}%</strong></div></td>
          <td>{member.answered_required}/{member.total_required}</td>
          <td><span className="status">{member.status?.replace("_", " ") ?? "Pendente"}</span></td>
          <td>{ready ? <Link className="button-primary" href={`/resultados/${member.assessment_id}`}>Entrar</Link> : <span className="muted">Disponível ao concluir</span>}</td>
        </tr>;
      })}</tbody></table></div> : <div className="empty-state">Nenhum integrante nas equipes vinculadas.</div>}
    </section>
  </>;
}