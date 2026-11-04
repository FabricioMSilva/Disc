begin;

create or replace function public.people_onboarding_summary()
returns table(total_people bigint, passwords_created bigint, not_started bigint, in_progress bigint, completed bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not (select public.is_admin()) then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  return query
  with directory_accounts as (
    select distinct coalesce(account.id, employee.id) as person_key, account.id as user_id
    from public.employee_directory employee
    left join auth.users account
      on account.id = employee.auth_user_id
      or (employee.auth_user_id is null and lower(trim(account.email)) = lower(trim(employee.email)))
    where employee.ativo
  ), population as (
    select person_key, user_id from directory_accounts
    union
    select member.user_id, member.user_id
    from public.team_members member
    join public.teams team on team.id = member.team_id and team.active
    where member.active and not exists (
      select 1 from directory_accounts directory where directory.user_id = member.user_id
    )
  ), person_state as (
    select person.person_key,
      nullif(account.encrypted_password, '') is not null as has_password,
      latest.status
    from population person
    left join auth.users account on account.id = person.user_id
    left join lateral (
      select assessment.status
      from public.assessments assessment
      where assessment.user_id = person.user_id and assessment.status <> 'cancelada'
      order by assessment.created_at desc, assessment.id
      limit 1
    ) latest on true
  )
  select count(*),
    count(*) filter (where has_password),
    count(*) filter (where status is null),
    count(*) filter (where status in ('iniciada', 'em_andamento')),
    count(*) filter (where status = 'concluida')
  from person_state;
end;
$$;

revoke all on function public.people_onboarding_summary() from public, anon;
grant execute on function public.people_onboarding_summary() to authenticated;

commit;
