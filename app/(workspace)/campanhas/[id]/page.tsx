import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CampaignParticipantForm } from "@/components/campaigns/CampaignParticipantForm";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, profile }] = await Promise.all([params, requireUser()]);
  if (!profile || !["super_admin", "admin", "manager"].includes(profile.role)) redirect("/acesso-negado");
  const { data: campaign } = await supabase.from("campaigns").select("id,name,description,status,starts_at,ends_at,result_visibility")
    .eq("id", id).maybeSingle();
  if (!campaign) notFound();
  const { data: campaignTeams } = await supabase.from("campaign_teams").select("team_id").eq("campaign_id", id);
  const teamIds = [...new Set((campaignTeams ?? []).map((item) => item.team_id))];
  const [{ data: teams }, { data: assignments }] = teamIds.length ? await Promise.all([
    supabase.from("teams").select("id,name").in("id", teamIds),
    supabase.from("campaign_participants").select("participant_id,status,team_id").eq("campaign_id", id),
  ]) : [{ data: [] }, { data: [] }];
  const memberships = teamIds.length ? await supabase.from("team_members").select("user_id,team_id").in("team_id", teamIds).eq("active", true) : { data: [] };
  const memberRows = memberships.data ?? [];
  const userIds = [...new Set(memberRows.map((member) => member.user_id))];
  const { data: people } = userIds.length ? await supabase.from("profiles").select("id,nome,email,status").in("id", userIds) : { data: [] };
  const teamNames = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const names = new Map((people ?? []).map((person) => [person.id, person.nome || person.email]));
  const participantOptions = memberRows.flatMap((member) => {
    const name = names.get(member.user_id);
    return name ? [{ id: member.user_id, name: `${name} · ${teamNames.get(member.team_id) ?? "Equipe"}`, teamId: member.team_id }] : [];
  });
  const assignedIds = (assignments ?? []).map((item) => item.participant_id);
  const canAssign = profile.role !== "participant" && (teams?.length ?? 0) > 0;
  return <>
    <Link href="/campanhas" className="muted" style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 11 }}><ArrowLeft size={13} /> Campanhas</Link>
    <p className="eyebrow" style={{ marginTop: 18 }}>Campanha</p><h1 className="page-title">{campaign.name}</h1><p className="page-subtitle">{campaign.description || "Sem descrição"}</p>
    <div className="kpi-grid kpi-grid--three"><div className="surface kpi"><span className="kpi-label">Status</span><p className="kpi-value" style={{ fontSize: 17 }}>{campaign.status}</p></div><div className="surface kpi"><span className="kpi-label">Participantes atribuídos</span><p className="kpi-value">{assignedIds.length}</p></div><div className="surface kpi"><span className="kpi-label">Visibilidade de resultados</span><p className="kpi-value" style={{ fontSize: 14 }}>{campaign.result_visibility}</p></div></div>
    <section className="surface" style={{ padding: 20, marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><p className="eyebrow">Público-alvo</p><h2 style={{ fontSize: 17 }}>Equipes participantes</h2></div><UsersRound color="var(--blue)" /></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{(teams ?? []).map((team) => <span className="status" key={team.id}>{team.name}</span>)}</div>{canAssign && <div style={{ marginTop: 20 }}><h3 style={{ fontSize: 13 }}>Atribuir integrante</h3><CampaignParticipantForm campaignId={id} participants={participantOptions} assignedIds={assignedIds} /></div>}</section>
    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}><div style={{ padding: "15px 19px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Participantes</strong></div>{assignments?.length ? <div className="table-wrap"><table><thead><tr><th>Participante</th><th>Equipe</th><th>Status</th></tr></thead><tbody>{assignments.map((item) => <tr key={item.participant_id}><td>{names.get(item.participant_id) ?? "Participante"}</td><td>{teamNames.get(item.team_id ?? "") ?? "--"}</td><td><span className="status">{item.status.replace("_", " ")}</span></td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum participante atribuído.</div>}</section>
  </>;
}