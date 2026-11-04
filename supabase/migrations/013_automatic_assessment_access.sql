begin;

do $$
begin
  if not exists (select 1 from public.teams where code = 'JOSSIMAR' and active) then
    raise exception 'Execute a migração 012 primeiro para configurar a equipe do Jossimar.';
  end if;
end;
$$;

create or replace function public.ensure_jossimar_assessment_access(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  team_uuid uuid;
  profile_email text;
begin
  select id into team_uuid from public.teams where code = 'JOSSIMAR' and active;
  if team_uuid is null then
    raise exception 'A equipe do Jossimar não está configurada.' using errcode = 'P0002';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Conta de autenticação não encontrada.' using errcode = 'P0002';
  end if;

  insert into public.profiles (id, nome, email, matricula, funcao, role, status, ativo)
  select account.id,
    coalesce(
      nullif(employee.nome, ''),
      nullif(account.raw_user_meta_data ->> 'name', ''),
      nullif(account.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(account.email, ''), '@', 1)
    ),
    coalesce(account.email, ''), employee.matricula, employee.perfil,
    'participant', 'active', true
  from auth.users account
  left join public.employee_directory employee
    on lower(trim(employee.email)) = lower(trim(account.email))
  where account.id = p_user_id
  on conflict (id) do nothing;

  select email into profile_email from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Perfil da conta não encontrado.' using errcode = 'P0002';
  end if;

  update public.profiles
  set status = 'active', ativo = true
  where id = p_user_id and (status <> 'active' or not ativo);

  update public.employee_directory employee
  set auth_user_id = p_user_id
  where employee.auth_user_id is null
    and lower(trim(employee.email)) = lower(trim(profile_email))
    and not exists (
      select 1 from public.employee_directory linked where linked.auth_user_id = p_user_id
    );

  if not exists (
    select 1 from public.team_members
    where team_id = team_uuid and user_id = p_user_id and active
  ) then
    insert into public.team_members (team_id, user_id)
    values (team_uuid, p_user_id)
    on conflict (team_id, user_id, started_at) do update set active = true, ended_at = null;
  end if;

  insert into public.campaign_teams (campaign_id, team_id)
  select id, team_uuid from public.campaigns where status = 'active' and require_assignment
  on conflict (campaign_id, team_id) do nothing;

  insert into public.campaign_participants (campaign_id, participant_id, team_id, status)
  select campaign.id, p_user_id, team_uuid,
    case
      when assessment.status = 'concluida' then 'completed'
      when assessment.status in ('iniciada', 'em_andamento') then 'in_progress'
      else 'not_started'
    end
  from public.campaigns campaign
  left join public.assessments assessment
    on assessment.cycle_id = campaign.assessment_cycle_id and assessment.user_id = p_user_id
  where campaign.status = 'active' and campaign.require_assignment
  on conflict (campaign_id, participant_id) do nothing;
end;
$$;

revoke all on function public.ensure_jossimar_assessment_access(uuid) from public, anon, authenticated;

create or replace function public.accept_current_user_invitation()
returns void language plpgsql security definer set search_path = '' as $$
declare
  auth_email text;
  confirmed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sessão necessária.' using errcode = '42501';
  end if;
  select email, email_confirmed_at into auth_email, confirmed_at
  from auth.users where id = auth.uid();
  perform public.ensure_jossimar_assessment_access(auth.uid());
  if confirmed_at is not null then
    perform public.accept_invitation_for_user(auth.uid(), auth_email);
  end if;
end;
$$;

revoke all on function public.accept_current_user_invitation() from public, anon;
grant execute on function public.accept_current_user_invitation() to authenticated;

do $$
declare profile_row record;
begin
  for profile_row in select id from auth.users order by id loop
    perform public.ensure_jossimar_assessment_access(profile_row.id);
  end loop;
end;
$$;

commit;
