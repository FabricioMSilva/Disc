import { requireTeamManager } from "@/lib/auth";
import { InvitationForm } from "@/components/people/InvitationForm";

export default async function ManagerPeoplePage() {
  const { supabase, user } = await requireTeamManager();
  const now = new Date().toISOString();
  const { data: assignments } = await supabase.from("manager_team_assignments").select("team_id")
    .eq("manager_id", user.id).eq("active", true).lte("valid_from", now).or(`valid_until.is.null,valid_until.gt.${now}`);
  const teamIds = [...new Set((assignments ?? []).map((item) => item.team_id))];
  const [{ data: teams }, { data: invitations }] = teamIds.length ? await Promise.all([
    supabase.from("teams").select("id,name").in("id", teamIds),
    supabase.from("invitations").select("id,email,status,created_at,team_id").eq("status", "pending").in("team_id", teamIds).order("created_at", { ascending: false }),
  ]) : [{ data: [] }, { data: [] }];
  const teamNames = new Map((teams ?? []).map((team) => [team.id, team.name]));
  return <><p className="eyebrow">Pessoas</p><h1 className="page-title">Adicionar funcionário</h1><p className="page-subtitle">Convide participantes somente para equipes sob sua gestão.</p>
    <div style={{ maxWidth: 540, marginTop: 22 }}><InvitationForm teams={teams ?? []} manager /></div>
    <section className="surface" style={{ marginTop: 16, overflow: "hidden" }}><div style={{ padding: "15px 18px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Convites pendentes da equipe</strong></div>{invitations?.length ? <div className="table-wrap"><table><thead><tr><th>E-mail</th><th>Equipe</th><th>Status</th><th>Enviado</th></tr></thead><tbody>{invitations.map((invite) => <tr key={invite.id}><td>{invite.email}</td><td>{teamNames.get(invite.team_id ?? "") ?? "--"}</td><td>{invite.status}</td><td>{new Date(invite.created_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum convite pendente.</div>}</section>
  </>;
}