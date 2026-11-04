import { requireAdmin } from "@/lib/auth";
import { ProfileAccessEditor } from "@/components/people/ProfileAccessEditor";
import { WorkScheduleEditor } from "@/components/people/WorkScheduleEditor";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { PeopleProgressSummary } from "@/components/people/PeopleProgressSummary";

export default async function AdminPeoplePage() {
  const { supabase, user, profile } = await requireAdmin();
  const [{ data: people }, { data: teams }, { data: schedules, error: schedulesError }, { data: progress, error: progressError }, { data: results, error: resultsError }, { data: onboarding, error: onboardingError }] = await Promise.all([
    supabase.from("profiles").select("id,nome,email,matricula,funcao,role,status,created_at").order("created_at", { ascending: false }),
    supabase.from("teams").select("id,name").eq("active", true).order("name"),
    supabase.from("employee_directory").select("auth_user_id,horario_trabalho").not("auth_user_id", "is", null),
    supabase.rpc("team_assessment_progress", { p_team_id: null }),
    supabase.from("admin_assessment_results").select("assessment_id,perfil_predominante").eq("status", "concluida"),
    supabase.rpc("people_onboarding_summary"),
  ]);
  if (schedulesError) throw new Error(`Não foi possível carregar os horários de trabalho: ${schedulesError.message}`);
  if (progressError) throw new Error(`Não foi possível carregar o progresso das equipes: ${progressError.message}`);
  if (resultsError) throw new Error(`Não foi possível carregar os resultados das avaliações: ${resultsError.message}`);

  const scheduleByUser = new Map((schedules ?? []).flatMap((item) => item.auth_user_id ? [[item.auth_user_id, item.horario_trabalho] as const] : []));
  const memberByUser = new Map((progress ?? []).map((member) => [member.user_id, member]));
  const bySchedule = new Map([
    ["Turno", { name: "Turno", total: 0 }],
    ["Administrativo", { name: "Administrativo", total: 0 }],
    ["Não definido", { name: "Não definido", total: 0 }],
  ]);
  const scheduleComparison = new Map([
    ["Turno", { name: "Turno", pending: 0, inProgress: 0, completed: 0 }],
    ["Administrativo", { name: "Administrativo", pending: 0, inProgress: 0, completed: 0 }],
    ["Não definido", { name: "Não definido", pending: 0, inProgress: 0, completed: 0 }],
  ]);
  memberByUser.forEach((member, userId) => {
    const savedSchedule = scheduleByUser.get(userId);
    const schedule = savedSchedule === "Turno" || savedSchedule === "Administrativo" ? savedSchedule : "Não definido";
    bySchedule.get(schedule)!.total += 1;
    const status = scheduleComparison.get(schedule)!;
    if (member.status === "concluida") status.completed += 1;
    else if (member.status === "iniciada" || member.status === "em_andamento") status.inProgress += 1;
    else status.pending += 1;
  });
  const completedRows = (progress ?? []).filter((member) => member.status === "concluida");
  const teamCounts = new Map((teams ?? []).map((team) => [team.name, 0]));
  completedRows.forEach((member) => teamCounts.set(member.team_name, (teamCounts.get(member.team_name) ?? 0) + 1));
  const profileCounts = new Map<string, number>();
  const latestCompletedIds = new Set([...memberByUser.values()].filter((member) => member.status === "concluida").map((member) => member.assessment_id));
  const countedAssessmentIds = new Set<string>();
  (results ?? []).forEach((result) => {
    if (!latestCompletedIds.has(result.assessment_id) || countedAssessmentIds.has(result.assessment_id)) return;
    countedAssessmentIds.add(result.assessment_id);
    if (result.perfil_predominante) profileCounts.set(result.perfil_predominante, (profileCounts.get(result.perfil_predominante) ?? 0) + 1);
  });
  const summary = onboarding?.[0];
  if (onboardingError) console.error("Could not load onboarding summary", { code: onboardingError.code, message: onboardingError.message });
  return <>
    <p className="eyebrow">Pessoas</p><h1 className="page-title">Pessoas e acessos</h1><p className="page-subtitle">Acompanhamento por equipe e horário, perfis e acessos.</p>
    {summary && !onboardingError ? <PeopleProgressSummary summary={summary} /> : <section className="surface" role="alert" style={{ padding: 20, margin: "20px 0", borderLeft: "3px solid var(--orange)" }}>
      <strong>Acompanhamento de senhas indisponível</strong>
      <p className="muted">Não foi possível consultar os indicadores de cadastro. Se a atualização ainda não foi aplicada, execute a migração 014 no Supabase e atualize esta página.</p>
    </section>}
    <DashboardCharts
      completedProfiles
      byTeam={[...teamCounts].map(([name, total]) => ({ name, total }))}
      discProfiles={[...profileCounts].map(([name, total]) => ({ name, total }))}
      bySchedule={[...bySchedule.values()]}
      scheduleComparison={[...scheduleComparison.values()]}
    />
    <div style={{ marginTop: 24 }}>
      <section className="surface" style={{ overflow: "hidden" }}><div style={{ padding: "15px 18px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Usuários ({people?.length ?? 0})</strong></div>{people?.length ? <div className="table-wrap"><table><thead><tr><th>Pessoa</th><th>Matrícula / função</th><th>Horário</th><th>Acesso</th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><td><strong>{person.nome || "Nome não informado"}</strong><div className="muted" style={{ fontSize: 10 }}>{person.email}</div></td><td>{person.matricula || "--"}<div className="muted" style={{ fontSize: 10 }}>{person.funcao || "--"}</div></td><td><WorkScheduleEditor userId={person.id} name={person.nome || person.email} schedule={scheduleByUser.get(person.id) ?? null} available={scheduleByUser.has(person.id)} /></td><td>{person.id === user.id ? <span className="status">Sua conta</span> : <ProfileAccessEditor userId={person.id} role={person.role} status={person.status} superAdmin={profile?.role === "super_admin"} />}</td></tr>)}</tbody></table></div> : <div className="empty-state">Nenhum perfil cadastrado.</div>}</section>
    </div>
  </>;
}