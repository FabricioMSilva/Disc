import { requireAdmin } from "@/lib/auth";
import { InvitationForm } from "@/components/people/InvitationForm";
import { ProfileAccessEditor } from "@/components/people/ProfileAccessEditor";

export default async function AdminPeoplePage() {
  const { supabase, user, profile } = await requireAdmin();
  const [{ data: people }, { data: teams }, { data: invitations }] = await Promise.all([
    supabase.from("profiles").select("id,nome,email,matricula,funcao,role,status,created_at").order("created_at", { ascending: false }),
    supabase.from("teams").select("id,name").eq("active", true).order("name"),
    supabase.from("invitations").select("id,email,role,status,created_at,team_id").eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  const teamNames = new Map((teams ?? []).map((team) => [team.id, team.name]));
  return <>
    <p className="eyebrow">Acesso e identidade</p><h1 className="page-title">Pessoas e acessos</h1><p className="page-subtitle">Perfis, funções e convites pendentes.</p>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, .7fr)", gap: 14, marginTop: 24, alignItems: "start" }}>
      <section className="surface" style={{ overflow: "hidden" }}><div style={{ padding: "15px 18px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Usuários ({people?.length ?? 0})</strong></div>{people?.length ? <div className="table-wrap"><table><thead><tr><th>Pessoa</th><th>Matrícula / função</th><th>Acesso</th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><td><strong>{person.nome || "Nome não informado"}</strong><div className="muted" style={{ fontSize: 10 }}>{person.email}</div></td><td>{person.matricula || "--"}<div className="muted" style={{ fontSize: 10 }}>{person.funcao || "--"}</div></td><td>{person.id === user.id ? <span className="status">Sua conta</span> : <ProfileAccessEditor userId={person.id} role={person.role} status={person.status} superAdmin={profile?.role === "super_admin"} />}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum perfil cadastrado.</div>}</section>
      <div style={{ display: "grid", gap: 14 }}><InvitationForm teams={teams ?? []} /><section className="surface" style={{ padding: 18 }}><p className="eyebrow">Onboarding</p><h2 style={{ fontSize: 16 }}>Contas novas</h2><p className="muted" style={{ fontSize: 11, lineHeight: 1.6 }}>Os convites ficam registrados no banco. O envio por e-mail depende de configurar SMTP/Invite no Supabase Auth; nenhuma chave administrativa é usada no navegador.</p></section></div>
    </div>
    <section className="surface" style={{ marginTop: 15, overflow: "hidden" }}><div style={{ padding: "15px 18px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Convites pendentes</strong></div>{invitations?.length ? <div className="table-wrap"><table><thead><tr><th>E-mail</th><th>Acesso solicitado</th><th>Equipe</th><th>Criado em</th></tr></thead><tbody>{invitations.map((invite) => <tr key={invite.id}><td>{invite.email}</td><td>{invite.role.replace("_", " ")}</td><td>{teamNames.get(invite.team_id ?? "") ?? "--"}</td><td>{new Date(invite.created_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum convite pendente.</div>}</section>
  </>;
}