alter table public.employee_directory
  add column if not exists horario_trabalho text;

create or replace function public.team_member_work_schedules(p_team_id uuid default null)
returns table(user_id uuid, horario_trabalho text)
language sql stable security definer set search_path = '' as $$
  select distinct e.auth_user_id, e.horario_trabalho
  from public.employee_directory e
  join public.team_members tm on tm.user_id = e.auth_user_id and tm.active
  where e.auth_user_id is not null
    and (p_team_id is null or tm.team_id = p_team_id)
    and (
      (select public.is_admin())
      or (
        (select public.is_manager())
        and (select public.manages_team(tm.team_id))
      )
    );
$$;

create or replace function public.set_team_member_work_schedule(
  p_user_id uuid,
  p_horario_trabalho text
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária' using errcode = '42501';
  end if;

  if p_horario_trabalho is not null
    and p_horario_trabalho not in ('Turno', 'Administrativo') then
    raise exception 'Horário de trabalho inválido' using errcode = '22023';
  end if;

  if not (select public.is_admin()) and not (
    (select public.is_manager())
    and exists (
      select 1
      from public.team_members tm
      where tm.user_id = p_user_id
        and tm.active
        and (select public.manages_team(tm.team_id))
    )
  ) then
    raise exception 'Sem permissão para alterar este integrante' using errcode = '42501';
  end if;

  update public.employee_directory
  set horario_trabalho = p_horario_trabalho
  where auth_user_id = p_user_id;

  if not found then
    raise exception 'Cadastro do integrante não encontrado' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.team_member_work_schedules(uuid) from public, anon;
revoke all on function public.set_team_member_work_schedule(uuid, text) from public, anon;
grant execute on function public.team_member_work_schedules(uuid) to authenticated;
grant execute on function public.set_team_member_work_schedule(uuid, text) to authenticated;
