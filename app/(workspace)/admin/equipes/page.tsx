import { requireAdmin } from "@/lib/auth";
import { AssignManagerForm, CreateTeamForm } from "@/components/people/TeamForms";

export default async function AdminTeamsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: teams }, { data: managers }, { data: assignments }] = await Promise.all([
    supabase.from("teams").select("id,name,code,active,area_id").order("name"),
    supabase.from("profiles").select("id,nome,email").eq("role", "manager").eq("status", "active").order("nome"),
    supabase.from("manager_team_assignments").select("id,manager_id,team_id,active,valid_from,valid_until").eq("active", true),
  ]);
  const managerNames = new Map((managers ?? []).map((manager) => [manager.id, manager.nome || manager.email]));
  const teamNames = new Map((teams ?? []).map((team) => [team.id, team.name]));
  return <>
    <p className="eyebrow">Estrutura organizacional</p><h1 className="page-title">Equipes e gestores</h1><p className="page-subtitle">Histórico e vigência dos vínculos de gestão.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, marginTop: 24 }}><CreateTeamForm /><AssignManagerForm teams={(teams ?? []).map((team) => ({ id: team.id, name: team.name }))} managers={(managers ?? []).map((manager) => ({ id: manager.id, name: manager.nome || manager.email }))} /></div>
    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}><div style={{ padding: "15px 18px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Equipes ({teams?.length ?? 0})</strong></div>{teams?.length ? <div className="table-wrap"><table><thead><tr><th>Equipe</th><th>Código</th><th>Status</th><th>Gestores vinculados</th></tr></thead><tbody>{teams.map((team) => { const assigned = (assignments ?? []).filter((item) => item.team_id === team.id); return <tr key={team.id}><td>{team.name}</td><td>{team.code || "--"}</td><td><span className="status">{team.active ? "Ativa" : "Inativa"}</span></td><td>{assigned.length ? assigned.map((item) => managerNames.get(item.manager_id)).filter(Boolean).join(", ") : "--"}</td></tr>; })}</tbody></table></div> : <div className="empty-state">Nenhuma equipe cadastrada.</div>}</section>
  </>;
}