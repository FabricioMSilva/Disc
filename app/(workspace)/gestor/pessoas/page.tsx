import Link from "next/link";
import { requireTeamManager } from "@/lib/auth";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { WorkScheduleEditor } from "@/components/people/WorkScheduleEditor";
import { PersonalAssessmentCard } from "@/components/assessment/PersonalAssessmentCard";

export default async function ManagerPeoplePage() {
  const { supabase, user } = await requireTeamManager();
  const now = new Date().toISOString();
  const { data: assignments, error: assignmentError } = await supabase.from("manager_team_assignments").select("team_id")
    .eq("manager_id", user.id).eq("active", true).lte("valid_from", now).or(`valid_until.is.null,valid_until.gt.${now}`);
  if (assignmentError) throw new Error(`Não foi possível carregar as equipes vinculadas: ${assignmentError.message}`);
  const teamIds = [...new Set((assignments ?? []).map((assignment) => assignment.team_id))];
  const [{ data: teams, error: teamsError }, { data: progress, error: progressError }, { data: schedules, error: schedulesError }] = await Promise.all([
    teamIds.length ? supabase.from("teams").select("id,name").in("id", teamIds) : Promise.resolve({ data: [], error: null }),
    supabase.rpc("team_assessment_progress", { p_team_id: null }),
    supabase.rpc("team_member_work_schedules", { p_team_id: null }),
  ]);
  if (teamsError) throw new Error(`Não foi possível carregar as equipes: ${teamsError.message}`);
  if (progressError) throw new Error(`Não foi possível carregar o progresso da equipe: ${progressError.message}`);
  if (schedulesError) throw new Error(`Não foi possível carregar os horários de trabalho: ${schedulesError.message}`);

  const rows = (progress ?? []).filter((row) => teamIds.includes(row.team_id));
  const memberRows = [...new Map(rows.map((row) => [row.user_id, row])).values()];
  const completed = memberRows.filter((member) => member.status === "concluida").length;
  const inProgress = memberRows.filter((member) => member.status === "iniciada" || member.status === "em_andamento").length;
  const pending = memberRows.filter((member) => !member.status).length;
  const participation = memberRows.length ? Math.round((completed / memberRows.length) * 100) : 0;
  const metrics = [
    { label: "Integrantes", value: memberRows.length },
    { label: "Pendentes", value: pending },
    { label: "Em andamento", value: inProgress },
    { label: "Concluídas", value: completed },
    { label: "Participação", value: `${participation}%` },
  ];

  const completedAssessmentIds = [...new Set(memberRows.flatMap((row) => row.status === "concluida" && row.assessment_id ? [row.assessment_id] : []))];
  const { data: visibleResults, error: resultsError } = completedAssessmentIds.length
    ? await supabase.from("admin_assessment_results").select("assessment_id,perfil_predominante").in("assessment_id", completedAssessmentIds)
    : { data: [], error: null };
  if (resultsError) throw new Error(`Não foi possível carregar os resultados da equipe: ${resultsError.message}`);

  const teamCounts = new Map((teams ?? []).map((team) => [team.name, 0]));
  rows.filter((row) => row.status === "concluida").forEach((row) => {
    teamCounts.set(row.team_name, (teamCounts.get(row.team_name) ?? 0) + 1);
  });
  const profileCounts = new Map<string, number>();
  (visibleResults ?? []).forEach((result) => {
    if (result.perfil_predominante) profileCounts.set(result.perfil_predominante, (profileCounts.get(result.perfil_predominante) ?? 0) + 1);
  });
  const teamChart = [...teamCounts].map(([name, total]) => ({ name, total }));
  const discChart = [...profileCounts].map(([name, total]) => ({ name, total }));
  const scheduleByUser = new Map((schedules ?? []).map((schedule) => [schedule.user_id, schedule.horario_trabalho]));
  const scheduleCounts = new Map([["Turno", 0], ["Administrativo", 0], ["Não definido", 0]]);
  const comparison = new Map([
    ["Turno", { name: "Turno", pending: 0, inProgress: 0, completed: 0 }],
    ["Administrativo", { name: "Administrativo", pending: 0, inProgress: 0, completed: 0 }],
    ["Não definido", { name: "Não definido", pending: 0, inProgress: 0, completed: 0 }],
  ]);
  memberRows.forEach((member) => {
    const savedSchedule = scheduleByUser.get(member.user_id);
    const schedule = savedSchedule === "Turno" || savedSchedule === "Administrativo" ? savedSchedule : "Não definido";
    scheduleCounts.set(schedule, (scheduleCounts.get(schedule) ?? 0) + 1);
    const status = comparison.get(schedule);
    if (!status || member.status === "concluida") {
      if (status) status.completed += 1;
    } else if (member.status === "iniciada" || member.status === "em_andamento") {
      status.inProgress += 1;
    } else {
      status.pending += 1;
    }
  });
  const bySchedule = [...scheduleCounts].map(([name, total]) => ({ name, total }));
  const scheduleComparison = [...comparison.values()];
  const scheduleUsers = new Set((schedules ?? []).map((schedule) => schedule.user_id));

  return <>
    <p className="eyebrow">Pessoas</p><h1 className="page-title">Pessoas da equipe</h1>
    <p className="page-subtitle">Acompanhamento de participação, resultados e comparação por horário de trabalho.</p>
    <PersonalAssessmentCard supabase={supabase} userId={user.id} />
    <div className="kpi-grid">{metrics.map((metric) => <article key={metric.label} className="surface kpi"><span className="kpi-label">{metric.label}</span><p className="kpi-value">{metric.value}</p></article>)}</div>
    <DashboardCharts completedProfiles byTeam={teamChart} discProfiles={discChart} bySchedule={bySchedule} scheduleComparison={scheduleComparison} />

    <section className="surface" style={{ marginTop: 14, overflow: "hidden" }}>
      <div style={{ padding: "15px 18px", borderBottom: "1px solid var(--line)" }}><strong style={{ fontSize: 13 }}>Integrantes e andamento</strong></div>
      {rows.length ? <div className="table-wrap"><table><thead><tr><th>Integrante</th><th>Equipe</th><th>Horário</th><th>Andamento</th><th>Status</th><th>Resultado</th></tr></thead><tbody>{rows.map((member) => {
        const ready = member.status === "concluida" && member.assessment_id;
        return <tr key={`${member.team_id}-${member.user_id}`}>
          <td>{member.participant_name}<div className="muted" style={{ fontSize: 10 }}>{member.matricula || "--"} · {member.funcao || "Sem função"}</div></td>
          <td>{member.team_name}</td>
          <td><WorkScheduleEditor userId={member.user_id} name={member.participant_name} schedule={scheduleByUser.get(member.user_id) ?? null} available={scheduleUsers.has(member.user_id)} /></td>
          <td><div className="progress-cell"><div className="report-progress-track"><span style={{ width: `${member.completion_percent}%`, background: member.completion_percent === 100 ? "var(--green)" : "var(--blue)" }} /></div><strong>{member.completion_percent}%</strong></div><div className="muted" style={{ marginTop: 4, fontSize: 10 }}>{member.answered_required}/{member.total_required} respostas</div></td>
          <td><span className="status">{member.status?.replace("_", " ") ?? "Pendente"}</span></td>
          <td>{ready ? <Link className="button-primary" href={`/resultados/${member.assessment_id}`}>Ver resultado</Link> : <span className="muted">Após concluir</span>}</td>
        </tr>;
      })}</tbody></table></div> : <div className="empty-state">Nenhum integrante encontrado nas equipes vinculadas.</div>}
    </section>

  </>;
}
