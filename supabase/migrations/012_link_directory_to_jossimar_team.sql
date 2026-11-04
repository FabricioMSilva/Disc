begin;

do $$
declare
  jossimar_id uuid;
  jossimar_team_id uuid;
  manager_count integer;
  active_team_count integer;
  eligible_employee_count integer;
  activated_profile_count integer;
  inserted_member_count integer;
  assigned_campaign_count integer;
begin
  select count(*)
  into manager_count
  from public.profiles
  where role in ('manager', 'admin', 'super_admin')
    and status = 'active'
    and lower(btrim(nome)) = 'jossimar silva';

  if manager_count <> 1 then
    raise exception 'Esperada exatamente uma conta ativa de Jossimar Silva com acesso de gestor ou administrador; encontradas: %.', manager_count;
  end if;

  select id
  into jossimar_id
  from public.profiles
  where role in ('manager', 'admin', 'super_admin')
    and status = 'active'
    and lower(btrim(nome)) = 'jossimar silva'
  limit 1;

  select count(distinct assignment.team_id)
  into active_team_count
  from public.manager_team_assignments assignment
  join public.teams team on team.id = assignment.team_id and team.active
  where assignment.manager_id = jossimar_id
    and assignment.active
    and assignment.valid_from <= now()
    and (assignment.valid_until is null or assignment.valid_until > now());

  if active_team_count = 0 then
    insert into public.teams (name, code, active, created_by)
    values ('Equipe Jossimar', 'JOSSIMAR', true, jossimar_id)
    on conflict (code) do update set active = true
    returning id into jossimar_team_id;

    update public.manager_team_assignments
    set active = false
    where manager_id = jossimar_id
      and team_id = jossimar_team_id
      and active
      and valid_until is null;

    insert into public.manager_team_assignments (manager_id, team_id, created_by)
    values (jossimar_id, jossimar_team_id, jossimar_id);
  end if;

  select count(distinct employee.auth_user_id)
  into eligible_employee_count
  from public.employee_directory employee
  join public.profiles profile on profile.id = employee.auth_user_id
  where employee.ativo
    and employee.auth_user_id is not null;

  if eligible_employee_count = 0 then
    raise exception 'Não há funcionários ativos da lista com conta vinculada.';
  end if;

  update public.profiles profile
  set status = 'active',
      ativo = true
  where profile.id in (
    select employee.auth_user_id
    from public.employee_directory employee
    where employee.ativo and employee.auth_user_id is not null
  )
    and (profile.status <> 'active' or not profile.ativo);
  get diagnostics activated_profile_count = row_count;

  insert into public.team_members (team_id, user_id)
  select distinct assignment.team_id, employee.auth_user_id
  from public.manager_team_assignments assignment
  join public.teams team on team.id = assignment.team_id and team.active
  cross join public.employee_directory employee
  join public.profiles profile on profile.id = employee.auth_user_id
  where assignment.manager_id = jossimar_id
    and assignment.active
    and assignment.valid_from <= now()
    and (assignment.valid_until is null or assignment.valid_until > now())
    and employee.ativo
    and employee.auth_user_id is not null
    and not exists (
      select 1
      from public.team_members member
      where member.team_id = assignment.team_id
        and member.user_id = employee.auth_user_id
        and member.active
    )
  on conflict (team_id, user_id, started_at) do update
  set active = true, ended_at = null;

  get diagnostics inserted_member_count = row_count;

  insert into public.campaign_teams (campaign_id, team_id)
  select distinct campaign.id, assignment.team_id
  from public.campaigns campaign
  cross join public.manager_team_assignments assignment
  join public.teams team on team.id = assignment.team_id and team.active
  where campaign.status = 'active'
    and campaign.require_assignment
    and assignment.manager_id = jossimar_id
    and assignment.active
    and assignment.valid_from <= now()
    and (assignment.valid_until is null or assignment.valid_until > now())
  on conflict (campaign_id, team_id) do nothing;

  insert into public.campaign_participants (campaign_id, participant_id, team_id, status, assigned_by)
  select distinct on (campaign.id, employee.auth_user_id)
    campaign.id, employee.auth_user_id, campaign_team.team_id,
    case
      when latest.status = 'concluida' then 'completed'
      when latest.status in ('iniciada', 'em_andamento') then 'in_progress'
      else 'not_started'
    end,
    jossimar_id
  from public.campaigns campaign
  join public.campaign_teams campaign_team on campaign_team.campaign_id = campaign.id
  join public.manager_team_assignments assignment on assignment.team_id = campaign_team.team_id
  join public.teams team on team.id = assignment.team_id and team.active
  cross join public.employee_directory employee
  join public.profiles profile on profile.id = employee.auth_user_id
  left join lateral (
    select assessment.status
    from public.assessments assessment
    where assessment.user_id = employee.auth_user_id
      and assessment.cycle_id = campaign.assessment_cycle_id
      and assessment.status <> 'cancelada'
    order by assessment.created_at desc
    limit 1
  ) latest on true
  where assignment.manager_id = jossimar_id
    and assignment.active
    and assignment.valid_from <= now()
    and (assignment.valid_until is null or assignment.valid_until > now())
    and campaign.status = 'active'
    and campaign.require_assignment
    and employee.ativo
    and employee.auth_user_id is not null
    and exists (
      select 1
      from public.team_members member
      where member.team_id = campaign_team.team_id
        and member.user_id = employee.auth_user_id
        and member.active
    )
  order by campaign.id, employee.auth_user_id, campaign_team.team_id
  on conflict (campaign_id, participant_id) do nothing;

  get diagnostics assigned_campaign_count = row_count;
  raise notice 'Perfis ativados: %. Vínculos de equipe adicionados/reativados: %. Inscrições em campanhas ativas: %.',
    activated_profile_count, inserted_member_count, assigned_campaign_count;
end;
$$;

commit;
