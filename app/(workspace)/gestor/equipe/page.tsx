import { requireManager } from "@/lib/auth";

export default async function ManagerTeamPage() {
  const { supabase, user } = await requireManager();
  const now = new Date().toISOString();
  const { data: assignments } = await supabase.from("manager_team_assignments").select("team_id")
    .eq("manager_id", user.id).eq("active", true).lte("valid_from", now).or(`valid_until.is.null,valid_until.gt.${now}`);
  const teamIds = [...new Set((assignments ?? []).map((item) => item.team_id))];
  const [{ data: teams }, { data: members }] = teamIds.length ? await Promise.all([
    supabase.from("teams").select("id,name").in("id", teamIds),
    supabase.from("team_members").select("user_id,team_id,started_at").in("team_id", teamIds).eq("active", true),
  ]) : [{ data: [] }, { data: [] }];
  const userIds = [...new Set((members ?? []).map((item) => item.user_id))];
  const { data: people } = userIds.length ? await supabase.from("profiles").select("id,nome,email,matricula,funcao,status").in("id", userIds) : { data: [] };
  const personMap = new Map((people ?? []).map((person) => [person.id, person]));
  const teamMap = new Map((teams ?? []).map((team) => [team.id, team.name]));
  return <><p className="eyebrow">Escopo da gestão</p><h1 className="page-title">Minha equipe</h1><p className="page-subtitle">Somente integrantes das equipes vinculadas ao seu perfil.</p>
    <section className="surface" style={{ marginTop: 24, overflow: "hidden" }}>{members?.length ? <div className="table-wrap"><table><thead><tr><th>Integrante</th><th>Matrícula</th><th>Função</th><th>Equipe</th><th>Status</th><th>Desde</th></tr></thead><tbody>{members.map((member) => { const person = personMap.get(member.user_id); return <tr key={`${member.team_id}-${member.user_id}`}><td>{person?.nome || person?.email || "Perfil indisponível"}<div className="muted" style={{ fontSize: 10 }}>{person?.email}</div></td><td>{person?.matricula || "--"}</td><td>{person?.funcao || "--"}</td><td>{teamMap.get(member.team_id) || "--"}</td><td><span className="status">{person?.status ?? "--"}</span></td><td>{new Date(member.started_at).toLocaleDateString("pt-BR")}</td></tr>; })}</tbody></table></div> : <div className="empty-state">Nenhum integrante nas equipes vinculadas.</div>}</section>
  </>;
}