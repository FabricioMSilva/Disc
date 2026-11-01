alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'manager', 'questionnaire_editor', 'participant', 'auditor'));
alter table public.profiles add column status text not null default 'active'
  check (status in ('invited', 'active', 'inactive'));
alter table public.profiles add column created_by uuid references public.profiles(id) on delete set null;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  description text,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete restrict,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (unit_id, name)
);
alter table public.teams add column area_id uuid references public.areas(id) on delete restrict;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  active boolean not null default true,
  started_at date not null default current_date,
  ended_at date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_members_dates check (ended_at is null or ended_at >= started_at),
  constraint team_members_unique_start unique (team_id, user_id, started_at)
);
create index team_members_team_id_idx on public.team_members(team_id);
create index team_members_user_id_idx on public.team_members(user_id);

create table public.manager_team_assignments (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint manager_assignment_dates check (valid_until is null or valid_until > valid_from)
);
create unique index manager_team_assignments_active_unique on public.manager_team_assignments(manager_id, team_id)
  where active and valid_until is null;
create index manager_team_assignments_team_id_idx on public.manager_team_assignments(team_id);

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'manager' and p.status = 'active');
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'super_admin' and p.status = 'active');
$$;

create or replace function public.is_auditor()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role = 'auditor' and p.status = 'active');
$$;

create or replace function public.manages_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select public.is_admin()) or exists (
    select 1 from public.manager_team_assignments m
    where m.manager_id = (select auth.uid()) and m.team_id = p_team_id and m.active
      and m.valid_from <= now() and (m.valid_until is null or m.valid_until > now())
  );
$$;

create or replace function public.can_access_participant(p_participant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select public.is_admin()) or p_participant_id = (select auth.uid()) or exists (
    select 1 from public.team_members tm
    join public.manager_team_assignments m on m.team_id = tm.team_id and m.active
      and m.valid_from <= now() and (m.valid_until is null or m.valid_until > now())
    where tm.user_id = p_participant_id and tm.active and m.manager_id = (select auth.uid())
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.role in ('super_admin', 'admin') and p.status = 'active');
$$;

create or replace function public.add_team_member(p_team_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare membership_id uuid;
begin
  if auth.uid() is null or not (select public.manages_team(p_team_id)) then
    raise exception 'Sem permissão para incluir participantes nesta equipe.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id and p.status = 'active') then
    raise exception 'Participante ativo não encontrado.' using errcode = '22023';
  end if;
  update public.team_members set active = false, ended_at = current_date
  where user_id = p_user_id and active and team_id <> p_team_id;
  insert into public.team_members(team_id, user_id, created_by)
  values (p_team_id, p_user_id, auth.uid())
  on conflict (team_id, user_id, started_at) do update set active = true, ended_at = null
  returning id into membership_id;
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'team_member.added', jsonb_build_object('team_id', p_team_id, 'participant_id', p_user_id));
  return membership_id;
end;
$$;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.manager_team_assignments enable row level security;
alter table public.organizations enable row level security;
alter table public.units enable row level security;
alter table public.areas enable row level security;

create policy teams_read_scoped on public.teams for select to authenticated
using ((select public.is_admin()) or (select public.manages_team(teams.id)) or exists (
  select 1 from public.team_members tm where tm.team_id = teams.id and tm.user_id = (select auth.uid()) and tm.active
));
create policy teams_admin_manage on public.teams for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy organizations_read_scoped on public.organizations for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.units u join public.areas ar on ar.unit_id = u.id join public.teams t on t.area_id = ar.id
  where u.organization_id = organizations.id and (select public.manages_team(t.id))
));
create policy organizations_admin_manage on public.organizations for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy units_read_scoped on public.units for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.areas ar join public.teams t on t.area_id = ar.id
  where ar.unit_id = units.id and (select public.manages_team(t.id))
));
create policy units_admin_manage on public.units for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy areas_read_scoped on public.areas for select to authenticated
using ((select public.is_admin()) or exists (select 1 from public.teams t where t.area_id = areas.id and (select public.manages_team(t.id))));
create policy areas_admin_manage on public.areas for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy team_members_read_scoped on public.team_members for select to authenticated
using ((select public.is_admin()) or user_id = (select auth.uid()) or (select public.manages_team(team_id)));
create policy team_members_admin_manage on public.team_members for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy manager_assignments_read_scoped on public.manager_team_assignments for select to authenticated
using ((select public.is_admin()) or manager_id = (select auth.uid()));
create policy manager_assignments_admin_manage on public.manager_team_assignments for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy profiles_read_self_or_admin on public.profiles;
create policy profiles_read_scoped on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()) or exists (
  select 1 from public.team_members tm join public.manager_team_assignments m
    on m.team_id = tm.team_id and m.active and m.valid_from <= now()
      and (m.valid_until is null or m.valid_until > now())
  where tm.user_id = profiles.id and tm.active and m.manager_id = (select auth.uid())
));
drop policy results_read_admin on public.assessment_results;
create policy results_read_authorized on public.assessment_results for select to authenticated
using (exists (select 1 from public.assessments a where a.id = assessment_id
  and (select public.can_access_participant(a.user_id))));
drop policy answers_read_owner_or_admin on public.answers;
create policy answers_read_scoped on public.answers for select to authenticated
using (exists (select 1 from public.assessments a where a.id = assessment_id
  and (select public.can_access_participant(a.user_id))));
drop policy text_answers_read_owner_or_admin on public.text_answers;
create policy text_answers_read_scoped on public.text_answers for select to authenticated
using (exists (select 1 from public.assessments a where a.id = assessment_id
  and (select public.can_access_participant(a.user_id))));
drop policy assessments_read_owner_or_admin on public.assessments;
create policy assessments_read_scoped on public.assessments for select to authenticated
using ((select public.can_access_participant(user_id)));

create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
revoke all on public.teams, public.team_members, public.manager_team_assignments from anon, authenticated;
grant select on public.teams, public.team_members, public.manager_team_assignments,
  public.organizations, public.units, public.areas to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_auditor() to authenticated;
grant execute on function public.manages_team(uuid) to authenticated;
grant execute on function public.can_access_participant(uuid) to authenticated;
grant execute on function public.add_team_member(uuid, uuid) to authenticated;
drop policy audit_read_admin on public.audit_logs;
create policy audit_read_authorized on public.audit_logs for select to authenticated
using ((select public.is_admin()) or (select public.is_auditor()));