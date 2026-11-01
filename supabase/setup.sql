-- People Insights: complete Supabase setup for a new project.
-- Run once in Supabase SQL Editor. Includes the initial DISC questionnaire and campaign seed.
-- Do not run on a database where these migrations have already been applied.
BEGIN;

-- ===== supabase/migrations/001_disc_schema.sql =====
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '', email text not null unique,
  matricula text, funcao text, equipe text, gestor text,
  role text not null default 'participant' check (role in ('participant', 'admin')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.assessment_cycles (
  id uuid primary key default gen_random_uuid(), titulo text not null, descricao text,
  data_inicio timestamptz not null default now(), data_fim timestamptz,
  ativo boolean not null default true, created_at timestamptz not null default now(),
  constraint assessment_cycles_dates check (data_fim is null or data_fim >= data_inicio)
);
create unique index assessment_cycles_title_unique on public.assessment_cycles (lower(titulo));

create table public.themes (
  id uuid primary key default gen_random_uuid(), codigo text not null unique,
  nome text not null, descricao text not null, ordem integer not null unique check (ordem > 0),
  tipo text not null check (tipo in ('disc', 'competencia')),
  peso numeric not null default 1 check (peso > 0), ativo boolean not null default true
);

create table public.questions (
  id uuid primary key default gen_random_uuid(), theme_id uuid references public.themes(id) on delete restrict,
  numero integer not null unique check (numero > 0), texto text not null,
  tipo text not null check (tipo in ('escala', 'texto')), ordem integer not null unique check (ordem > 0),
  obrigatoria boolean not null default true, ativa boolean not null default true,
  constraint questions_theme_type check ((tipo = 'escala' and theme_id is not null) or (tipo = 'texto' and theme_id is null))
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(), cycle_id uuid not null references public.assessment_cycles(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'iniciada' check (status in ('iniciada', 'em_andamento', 'concluida', 'cancelada')),
  usuario_confirmado boolean not null default false, pergunta_atual integer not null default 1 check (pergunta_atual > 0),
  iniciada_em timestamptz not null default now(), concluida_em timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (cycle_id, user_id),
  constraint assessments_completion_date check ((status = 'concluida') = (concluida_em is not null))
);

create table public.answers (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create table public.text_answers (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  answer_text text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create table public.assessment_results (
  id uuid primary key default gen_random_uuid(), assessment_id uuid not null unique references public.assessments(id) on delete cascade,
  dominancia smallint not null check (dominancia between 5 and 25),
  influencia smallint not null check (influencia between 5 and 25),
  estabilidade smallint not null check (estabilidade between 5 and 25),
  conformidade smallint not null check (conformidade between 5 and 25),
  seguranca smallint not null check (seguranca between 5 and 25),
  disciplina smallint not null check (disciplina between 5 and 25),
  trabalho_equipe smallint not null check (trabalho_equipe between 5 and 25),
  comunicacao smallint not null check (comunicacao between 5 and 25),
  indice_competencias smallint not null check (indice_competencias between 20 and 100),
  perfil_predominante text not null check (perfil_predominante in ('D', 'I', 'S', 'C')),
  calculado_em timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  event_type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index assessments_user_id_idx on public.assessments (user_id);
create index assessments_cycle_id_idx on public.assessments (cycle_id);
create index assessments_status_idx on public.assessments (status);
create index assessments_created_at_idx on public.assessments (created_at desc);
create index answers_assessment_id_idx on public.answers (assessment_id);
create index answers_question_id_idx on public.answers (question_id);
create index text_answers_assessment_id_idx on public.text_answers (assessment_id);
create index text_answers_question_id_idx on public.text_answers (question_id);
create index questions_theme_id_idx on public.questions (theme_id);
create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_assessment_id_idx on public.audit_logs (assessment_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin' and p.ativo);
$$;

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  new_row jsonb := to_jsonb(new);
  old_row jsonb := to_jsonb(old);
  assessment_uuid uuid;
  actor_uuid uuid;
begin
  assessment_uuid := coalesce((new_row ->> 'assessment_id')::uuid, (old_row ->> 'assessment_id')::uuid,
    (new_row ->> 'id')::uuid, (old_row ->> 'id')::uuid);
  actor_uuid := coalesce((new_row ->> 'user_id')::uuid, (old_row ->> 'user_id')::uuid, auth.uid());
  insert into public.audit_logs (user_id, assessment_id, event_type, metadata)
  values (actor_uuid, assessment_uuid, tg_table_name || '.' || lower(tg_op), jsonb_build_object('table', tg_table_name));
  return coalesce(new, old);
end;
$$;
create trigger audit_assessments_changes after insert or update on public.assessments for each row execute function public.write_audit_log();
create trigger audit_answers_changes after insert or update on public.answers for each row execute function public.write_audit_log();
create trigger audit_text_answers_changes after insert or update on public.text_answers for each row execute function public.write_audit_log();

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger assessments_updated_at before update on public.assessments for each row execute function public.set_updated_at();
create trigger answers_updated_at before update on public.answers for each row execute function public.set_updated_at();
create trigger text_answers_updated_at before update on public.text_answers for each row execute function public.set_updated_at();

create or replace function public.start_assessment(p_cycle_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare assessment_uuid uuid;
begin
  if auth.uid() is null then raise exception 'Sessão necessária.' using errcode = '42501'; end if;
  if not exists (select 1 from public.assessment_cycles c where c.id = p_cycle_id and c.ativo
    and c.data_inicio <= now() and (c.data_fim is null or c.data_fim >= now())) then
    raise exception 'Ciclo indisponível.' using errcode = '22023';
  end if;
  insert into public.assessments (cycle_id, user_id, usuario_confirmado)
  values (p_cycle_id, auth.uid(), true)
  on conflict (cycle_id, user_id) do update set usuario_confirmado = true
  returning id into assessment_uuid;
  return assessment_uuid;
end;
$$;

create or replace function public.save_scale_answer(p_assessment_id uuid, p_question_id uuid, p_score smallint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_score not between 1 and 5 then raise exception 'Resposta inválida.' using errcode = '22023'; end if;
  if not exists (select 1 from public.assessments a where a.id = p_assessment_id and a.user_id = auth.uid()
    and a.usuario_confirmado and a.status in ('iniciada', 'em_andamento')) then
    raise exception 'Avaliação indisponível para edição.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.questions q where q.id = p_question_id and q.tipo = 'escala' and q.ativa) then
    raise exception 'Pergunta inválida.' using errcode = '22023';
  end if;
  insert into public.answers (assessment_id, question_id, score) values (p_assessment_id, p_question_id, p_score)
  on conflict (assessment_id, question_id) do update set score = excluded.score;
  update public.assessments set status = 'em_andamento' where id = p_assessment_id;
end;
$$;

create or replace function public.save_text_answer(p_assessment_id uuid, p_question_id uuid, p_answer_text text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sessão necessária.' using errcode = '42501'; end if;
  if not exists (select 1 from public.assessments a where a.id = p_assessment_id and a.user_id = auth.uid()
    and a.usuario_confirmado and a.status in ('iniciada', 'em_andamento')) then
    raise exception 'Avaliação indisponível para edição.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.questions q where q.id = p_question_id and q.tipo = 'texto' and q.ativa) then
    raise exception 'Pergunta inválida.' using errcode = '22023';
  end if;
  insert into public.text_answers (assessment_id, question_id, answer_text)
  values (p_assessment_id, p_question_id, left(trim(coalesce(p_answer_text, '')), 10000))
  on conflict (assessment_id, question_id) do update set answer_text = excluded.answer_text;
  update public.assessments set status = 'em_andamento' where id = p_assessment_id;
end;
$$;

create or replace function public.complete_assessment(p_assessment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  scores integer[];
  missing_count integer;
  dominant_profile text;
begin
  if auth.uid() is null or not exists (select 1 from public.assessments a where a.id = p_assessment_id
    and a.user_id = auth.uid() and a.usuario_confirmado and a.status in ('iniciada', 'em_andamento')) then
    raise exception 'Avaliação indisponível para envio.' using errcode = '42501';
  end if;
  select count(*) into missing_count from public.questions q where q.ativa and q.obrigatoria and (
    (q.tipo = 'escala' and not exists (select 1 from public.answers a where a.assessment_id = p_assessment_id and a.question_id = q.id))
    or (q.tipo = 'texto' and not exists (select 1 from public.text_answers t where t.assessment_id = p_assessment_id
      and t.question_id = q.id and length(trim(t.answer_text)) > 0))
  );
  if missing_count > 0 then raise exception 'Responda todas as perguntas obrigatórias.' using errcode = '23514'; end if;
  select array_agg(sum_score order by theme_order) into scores from (
    select t.ordem as theme_order, coalesce(sum(a.score), 0)::integer as sum_score
    from public.themes t join public.questions q on q.theme_id = t.id and q.tipo = 'escala' and q.ativa
    left join public.answers a on a.question_id = q.id and a.assessment_id = p_assessment_id
    where t.ativo group by t.id, t.ordem
  ) theme_scores;
  if coalesce(array_length(scores, 1), 0) <> 8 then raise exception 'Configuração de temas inválida.' using errcode = '23514'; end if;
  select codigo into dominant_profile from (
    select t.codigo, sum(a.score)::integer as total from public.themes t
    join public.questions q on q.theme_id = t.id and q.tipo = 'escala'
    join public.answers a on a.question_id = q.id and a.assessment_id = p_assessment_id
    where t.codigo in ('D', 'I', 'S', 'C') group by t.codigo
  ) disc_scores order by total desc, case codigo when 'D' then 1 when 'I' then 2 when 'S' then 3 else 4 end limit 1;
  insert into public.assessment_results (assessment_id, dominancia, influencia, estabilidade, conformidade,
    seguranca, disciplina, trabalho_equipe, comunicacao, indice_competencias, perfil_predominante)
  values (p_assessment_id, scores[1], scores[2], scores[3], scores[4], scores[5], scores[6], scores[7], scores[8],
    scores[5] + scores[6] + scores[7] + scores[8], dominant_profile)
  on conflict (assessment_id) do nothing;
  update public.assessments set status = 'concluida', concluida_em = now() where id = p_assessment_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.assessment_cycles enable row level security;
alter table public.themes enable row level security;
alter table public.questions enable row level security;
alter table public.assessments enable row level security;
alter table public.answers enable row level security;
alter table public.text_answers enable row level security;
alter table public.assessment_results enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_self_or_admin on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_admin_manage on public.profiles for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy cycles_read_active_or_admin on public.assessment_cycles for select to authenticated
using ((ativo and data_inicio <= now() and (data_fim is null or data_fim >= now())) or (select public.is_admin()));
create policy cycles_admin_manage on public.assessment_cycles for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy themes_read_active_or_admin on public.themes for select to authenticated
using (ativo or (select public.is_admin()));
create policy themes_admin_manage on public.themes for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy questions_read_active_or_admin on public.questions for select to authenticated
using (ativa or (select public.is_admin()));
create policy questions_admin_manage on public.questions for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy assessments_read_owner_or_admin on public.assessments for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy answers_read_owner_or_admin on public.answers for select to authenticated
using (exists (select 1 from public.assessments a where a.id = assessment_id and (a.user_id = (select auth.uid()) or (select public.is_admin()))));
create policy text_answers_read_owner_or_admin on public.text_answers for select to authenticated
using (exists (select 1 from public.assessments a where a.id = assessment_id and (a.user_id = (select auth.uid()) or (select public.is_admin()))));
create policy results_read_admin on public.assessment_results for select to authenticated using ((select public.is_admin()));
create policy audit_read_admin on public.audit_logs for select to authenticated using ((select public.is_admin()));

revoke all on public.profiles, public.assessment_cycles, public.themes, public.questions,
  public.assessments, public.answers, public.text_answers, public.assessment_results, public.audit_logs from anon, authenticated;
grant select on public.profiles, public.assessment_cycles, public.themes, public.questions,
  public.assessments, public.answers, public.text_answers, public.assessment_results, public.audit_logs to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.start_assessment(uuid) to authenticated;
grant execute on function public.save_scale_answer(uuid, uuid, smallint) to authenticated;
grant execute on function public.save_text_answer(uuid, uuid, text) to authenticated;
grant execute on function public.complete_assessment(uuid) to authenticated;

create or replace view public.admin_assessment_results with (security_invoker = true) as
select a.id as assessment_id, a.cycle_id, a.user_id, p.nome as participante, p.email, p.matricula,
  p.funcao, p.equipe, p.gestor, a.status, a.iniciada_em, a.concluida_em,
  r.dominancia, r.influencia, r.estabilidade, r.conformidade, r.seguranca, r.disciplina,
  r.trabalho_equipe, r.comunicacao, r.indice_competencias, r.perfil_predominante
from public.assessments a join public.profiles p on p.id = a.user_id
left join public.assessment_results r on r.assessment_id = a.id;
grant select on public.admin_assessment_results to authenticated;

-- ===== supabase/migrations/002_roles_and_teams.sql =====
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

-- ===== supabase/migrations/003_questionnaires_campaigns.sql =====
create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text not null unique,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'private' check (visibility in ('private', 'team', 'organization')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  published_at timestamptz,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (questionnaire_id, version_number)
);

create table public.questionnaire_sections (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.questionnaire_versions(id) on delete restrict,
  code text not null,
  title text not null,
  description text,
  section_type text not null default 'scored' check (section_type in ('introduction', 'scored', 'reflection', 'conclusion')),
  display_order integer not null check (display_order > 0),
  settings jsonb not null default '{}'::jsonb,
  unique (version_id, code),
  unique (version_id, display_order)
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  score numeric,
  display_order integer not null check (display_order > 0),
  unique (question_id, display_order)
);

alter table public.questions add column section_id uuid references public.questionnaire_sections(id) on delete restrict;
alter table public.questions add column weight numeric not null default 1 check (weight > 0);
alter table public.questions add column dimension_code text;
alter table public.questions add column settings jsonb not null default '{}'::jsonb;
alter table public.questions drop constraint if exists questions_numero_key;
alter table public.questions drop constraint if exists questions_ordem_key;
create unique index questions_section_order_unique on public.questions(section_id, ordem) where section_id is not null;
alter table public.questions drop constraint questions_theme_type;
alter table public.questions drop constraint questions_tipo_check;
alter table public.questions add constraint questions_tipo_check check (
  tipo in ('escala', 'texto', 'escolha_unica', 'multipla_escolha', 'numero', 'data', 'booleano', 'likert')
);
alter table public.questions add constraint questions_theme_or_section check (theme_id is not null or section_id is not null);

alter table public.answers alter column score drop not null;
alter table public.answers add column selected_option_id uuid references public.question_options(id) on delete restrict;
alter table public.answers add column numeric_value numeric;
alter table public.answers add column text_value text;
alter table public.answers add column boolean_value boolean;
alter table public.answers add column date_value date;
alter table public.answers add constraint answers_has_value check (
  score is not null or selected_option_id is not null or numeric_value is not null or
  text_value is not null or boolean_value is not null or date_value is not null
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  assessment_cycle_id uuid not null unique references public.assessment_cycles(id) on delete restrict,
  questionnaire_version_id uuid references public.questionnaire_versions(id) on delete restrict,
  owner_id uuid references public.profiles(id) on delete restrict,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'closed', 'archived')),
  result_visibility text not null default 'admin' check (result_visibility in ('admin', 'manager', 'participant')),
  require_assignment boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_dates check (ends_at is null or ends_at >= starts_at)
);

create table public.campaign_teams (
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (campaign_id, team_id)
);

create table public.campaign_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'not_started' check (status in ('invited', 'not_started', 'in_progress', 'completed')),
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (campaign_id, participant_id)
);
create index campaign_participants_user_idx on public.campaign_participants(participant_id, status);
create index campaigns_owner_idx on public.campaigns(owner_id);
create index questionnaire_versions_questionnaire_idx on public.questionnaire_versions(questionnaire_id);

alter table public.assessments add column campaign_participant_id uuid references public.campaign_participants(id) on delete restrict;
alter table public.assessments add column questionnaire_version_id uuid references public.questionnaire_versions(id) on delete restrict;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  team_id uuid references public.teams(id) on delete restrict,
  role text not null default 'participant' check (role in ('manager', 'questionnaire_editor', 'participant')),
  invited_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invitations_pending_email_team on public.invitations(lower(email), team_id) where status = 'pending';

create or replace function public.can_manage_questionnaire(p_questionnaire_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select public.is_admin()) or exists (
    select 1 from public.questionnaires q
    where q.id = p_questionnaire_id and q.owner_id = (select auth.uid())
      and exists (select 1 from public.profiles p where p.id = (select auth.uid())
        and p.role in ('questionnaire_editor', 'manager') and p.status = 'active')
  );
$$;

create or replace function public.version_is_editable(p_version_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.questionnaire_versions v
    where v.id = p_version_id and v.status = 'draft' and (select public.can_manage_questionnaire(v.questionnaire_id)));
$$;

create or replace function public.can_access_questionnaire(p_questionnaire_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select public.can_manage_questionnaire(p_questionnaire_id)) or exists (
    select 1 from public.questionnaires q join public.questionnaire_versions v on v.questionnaire_id = q.id
    where q.id = p_questionnaire_id and q.status = 'published' and v.status = 'published'
      and (q.visibility = 'organization' or (q.visibility = 'team' and exists (
        select 1 from public.campaigns c join public.campaign_teams ct on ct.campaign_id = c.id
        where c.questionnaire_version_id = v.id and c.status = 'active'
          and ((select public.manages_team(ct.team_id)) or exists (
            select 1 from public.team_members tm where tm.team_id = ct.team_id and tm.user_id = (select auth.uid()) and tm.active
          ))
      )))
  );
$$;

create or replace function public.prevent_published_question_edit()
returns trigger language plpgsql set search_path = '' as $$
declare section_uuid uuid;
begin
  section_uuid := coalesce(new.section_id, old.section_id);
  if section_uuid is not null and exists (
    select 1 from public.questionnaire_sections s join public.questionnaire_versions v on v.id = s.version_id
    where s.id = section_uuid and v.status <> 'draft'
  ) then
    raise exception 'Versões publicadas são imutáveis; crie uma nova versão.' using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger questions_immutable_published before update or delete on public.questions
for each row execute function public.prevent_published_question_edit();

alter table public.questionnaires enable row level security;
alter table public.questionnaire_versions enable row level security;
alter table public.questionnaire_sections enable row level security;
alter table public.question_options enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_teams enable row level security;
alter table public.campaign_participants enable row level security;
alter table public.invitations enable row level security;

drop policy questions_read_active_or_admin on public.questions;
drop policy questions_admin_manage on public.questions;
create policy questions_read_authorized on public.questions for select to authenticated
using ((theme_id is not null and ativa and exists (select 1 from public.themes t where t.id = theme_id and t.ativo))
  or (section_id is not null and exists (
    select 1 from public.questionnaire_sections s join public.questionnaire_versions v on v.id = s.version_id
    where s.id = section_id and (select public.can_access_questionnaire(v.questionnaire_id))
  )));
create policy questions_write_draft on public.questions for all to authenticated
using (section_id is not null and exists (select 1 from public.questionnaire_sections s
  where s.id = section_id and (select public.version_is_editable(s.version_id))))
with check (section_id is not null and exists (select 1 from public.questionnaire_sections s
  where s.id = section_id and (select public.version_is_editable(s.version_id))));

create policy questionnaires_read_authorized on public.questionnaires for select to authenticated
using ((select public.is_admin()) or owner_id = (select auth.uid()) or (select public.can_access_questionnaire(id)));
create policy questionnaires_insert_owner on public.questionnaires for insert to authenticated
with check (owner_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid())
  and p.role in ('admin', 'super_admin', 'manager', 'questionnaire_editor') and p.status = 'active'));
create policy questionnaires_update_owner_draft on public.questionnaires for update to authenticated
using ((select public.can_manage_questionnaire(id)) and status = 'draft')
with check ((select public.can_manage_questionnaire(id)) and status = 'draft');

create policy versions_read_authorized on public.questionnaire_versions for select to authenticated
using ((select public.is_admin()) or (select public.can_manage_questionnaire(questionnaire_id)) or
  (status = 'published' and (select public.can_access_questionnaire(questionnaire_id))));
create policy versions_insert_draft on public.questionnaire_versions for insert to authenticated
with check (status = 'draft' and (select public.can_manage_questionnaire(questionnaire_id)));
create policy versions_update_draft on public.questionnaire_versions for update to authenticated
using (status = 'draft' and (select public.can_manage_questionnaire(questionnaire_id)))
with check (status = 'draft' and (select public.can_manage_questionnaire(questionnaire_id)));

create policy sections_read_authorized on public.questionnaire_sections for select to authenticated
using (exists (select 1 from public.questionnaire_versions v where v.id = version_id
  and (select public.can_access_questionnaire(v.questionnaire_id))));
create policy sections_write_draft on public.questionnaire_sections for all to authenticated
using ((select public.version_is_editable(version_id))) with check (exists (
  select 1 from public.questionnaire_versions v where v.id = version_id and v.status = 'draft'
    and (select public.can_manage_questionnaire(v.questionnaire_id))
));
create policy options_read_authorized on public.question_options for select to authenticated
using (exists (select 1 from public.questions q where q.id = question_id and q.section_id is not null
  and exists (select 1 from public.questionnaire_sections s where s.id = q.section_id
    and exists (select 1 from public.questionnaire_versions v join public.questionnaires n on n.id = v.questionnaire_id
      where v.id = s.version_id and (select public.can_access_questionnaire(n.id))))));
create policy options_write_draft on public.question_options for all to authenticated
using (exists (select 1 from public.questions q join public.questionnaire_sections s on s.id = q.section_id
  where q.id = question_id and (select public.version_is_editable(s.version_id))))
with check (exists (select 1 from public.questions q join public.questionnaire_sections s on s.id = q.section_id
  where q.id = question_id and (select public.version_is_editable(s.version_id))));

create policy campaigns_read_scoped on public.campaigns for select to authenticated
using ((select public.is_admin()) or owner_id = (select auth.uid()) or exists (
  select 1 from public.campaign_teams ct where ct.campaign_id = campaigns.id and (select public.manages_team(ct.team_id))
) or exists (select 1 from public.campaign_participants cp where cp.campaign_id = campaigns.id and cp.participant_id = (select auth.uid())));
create policy campaigns_admin_or_manager_insert on public.campaigns for insert to authenticated
with check ((select public.is_admin()) or owner_id = (select auth.uid()));
create policy campaigns_owner_update on public.campaigns for update to authenticated
using ((select public.is_admin()) or owner_id = (select auth.uid()))
with check ((select public.is_admin()) or owner_id = (select auth.uid()));
create policy campaign_teams_read_scoped on public.campaign_teams for select to authenticated
using ((select public.is_admin()) or (select public.manages_team(team_id)));
create policy campaign_teams_admin_write on public.campaign_teams for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy campaign_participants_read_scoped on public.campaign_participants for select to authenticated
using (participant_id = (select auth.uid()) or (select public.is_admin()) or (select public.manages_team(team_id)));
create policy invitations_read_scoped on public.invitations for select to authenticated
using ((select public.is_admin()) or invited_by = (select auth.uid()) or (select public.manages_team(team_id)));
create policy invitations_insert_scoped on public.invitations for insert to authenticated
with check ((select public.is_admin()) or (invited_by = (select auth.uid()) and (select public.manages_team(team_id))));

drop policy results_read_authorized on public.assessment_results;
create policy results_read_by_campaign_visibility on public.assessment_results for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.assessments a
  join public.campaign_participants cp on cp.id = a.campaign_participant_id
  join public.campaigns c on c.id = cp.campaign_id
  where a.id = assessment_id and a.status = 'concluida' and (
    (a.user_id = (select auth.uid()) and c.result_visibility = 'participant') or
    (c.result_visibility = 'manager' and (select public.manages_team(cp.team_id)))
  )
));
drop policy answers_read_scoped on public.answers;
create policy answers_read_owner_or_admin on public.answers for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.assessments a where a.id = assessment_id and a.user_id = (select auth.uid())
));
drop policy text_answers_read_scoped on public.text_answers;
create policy text_answers_read_owner_or_admin on public.text_answers for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.assessments a where a.id = assessment_id and a.user_id = (select auth.uid())
));

create trigger questionnaires_updated_at before update on public.questionnaires for each row execute function public.set_updated_at();
create trigger campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
revoke all on public.questionnaires, public.questionnaire_versions, public.questionnaire_sections,
  public.question_options, public.campaigns, public.campaign_teams, public.campaign_participants, public.invitations
  from anon, authenticated;
grant select, insert, update on public.questionnaires, public.questionnaire_versions,
  public.questionnaire_sections, public.question_options, public.questions, public.invitations to authenticated;
grant select on public.campaigns, public.campaign_teams, public.campaign_participants to authenticated;
grant execute on function public.can_manage_questionnaire(uuid) to authenticated;
grant execute on function public.version_is_editable(uuid) to authenticated;
grant execute on function public.can_access_questionnaire(uuid) to authenticated;

-- ===== supabase/migrations/004_domain_operations.sql =====
create table public.questionnaire_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null unique references public.assessments(id) on delete restrict,
  total_score numeric,
  dimensions jsonb not null default '{}'::jsonb,
  dominant_dimension text,
  calculated_at timestamptz not null default now()
);
alter table public.assessment_results add column resultado_ponderado numeric(5,2) check (resultado_ponderado between 0 and 100);
alter table public.assessment_results add column classificacao_competencias text
  check (classificacao_competencias in ('Excelente', 'Muito Bom', 'Adequado', 'Requer Desenvolvimento'));
alter table public.assessment_results add column faixas_disc jsonb not null default '{}'::jsonb;
alter table public.assessment_results add column recomendacao text;

update public.assessment_results set
  resultado_ponderado = round(((dominancia + influencia + estabilidade + conformidade)::numeric / 100 * 20)
    + (seguranca::numeric / 25 * 30) + (disciplina::numeric / 25 * 20)
    + (trabalho_equipe::numeric / 25 * 20) + (comunicacao::numeric / 25 * 10), 2),
  classificacao_competencias = case when indice_competencias >= 81 then 'Excelente'
    when indice_competencias >= 61 then 'Muito Bom' when indice_competencias >= 41 then 'Adequado'
    else 'Requer Desenvolvimento' end,
  faixas_disc = jsonb_build_object(
    'D', case when dominancia >= 21 then 'Perfil Muito Forte' when dominancia >= 16 then 'Perfil Forte'
      when dominancia >= 11 then 'Perfil Moderado' else 'Perfil Pouco Evidente' end,
    'I', case when influencia >= 21 then 'Perfil Muito Forte' when influencia >= 16 then 'Perfil Forte'
      when influencia >= 11 then 'Perfil Moderado' else 'Perfil Pouco Evidente' end,
    'S', case when estabilidade >= 21 then 'Perfil Muito Forte' when estabilidade >= 16 then 'Perfil Forte'
      when estabilidade >= 11 then 'Perfil Moderado' else 'Perfil Pouco Evidente' end,
    'C', case when conformidade >= 21 then 'Perfil Muito Forte' when conformidade >= 16 then 'Perfil Forte'
      when conformidade >= 11 then 'Perfil Moderado' else 'Perfil Pouco Evidente' end),
  recomendacao = case perfil_predominante when 'D' then 'Liderança de DDS, coordenação de melhorias'
    when 'I' then 'Multiplicador de treinamentos e integração'
    when 'S' then 'Padronização operacional e mentorias'
    when 'C' then 'Auditorias, qualidade e análise de riscos' end;
create table public.answer_option_selections (
  answer_id uuid not null references public.answers(id) on delete cascade,
  option_id uuid not null references public.question_options(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (answer_id, option_id)
);
alter table public.answer_option_selections enable row level security;
create policy answer_options_read_owner_or_admin on public.answer_option_selections for select to authenticated
using (exists (select 1 from public.answers x join public.assessments a on a.id = x.assessment_id
  where x.id = answer_id and (a.user_id = (select auth.uid()) or (select public.is_admin()))));
revoke all on public.answer_option_selections from anon, authenticated;
grant select on public.answer_option_selections to authenticated;
alter table public.questionnaire_results enable row level security;
create policy questionnaire_results_read_admin on public.questionnaire_results for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.assessments a join public.campaign_participants cp on cp.id = a.campaign_participant_id
  join public.campaigns c on c.id = cp.campaign_id
  where a.id = assessment_id and a.status = 'concluida' and (
    (c.result_visibility = 'manager' and (select public.manages_team(cp.team_id))) or
    (c.result_visibility = 'participant' and a.user_id = (select auth.uid()))
  )
));
revoke all on public.questionnaire_results from anon, authenticated;
grant select on public.questionnaire_results to authenticated;

create or replace function public.create_team(p_name text, p_code text, p_description text, p_area_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare team_uuid uuid;
begin
  if auth.uid() is null or not (select public.is_admin()) then raise exception 'Acesso administrativo necessário.' using errcode = '42501'; end if;
  if length(trim(p_name)) not between 2 and 120 then raise exception 'Nome de equipe inválido.' using errcode = '22023'; end if;
  insert into public.teams(name, code, description, area_id, created_by)
  values (trim(p_name), nullif(trim(p_code), ''), nullif(trim(p_description), ''), p_area_id, auth.uid()) returning id into team_uuid;
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'team.created', jsonb_build_object('team_id', team_uuid));
  return team_uuid;
end;
$$;

create or replace function public.set_profile_access(p_user_id uuid, p_role text, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_role text;
begin
  if auth.uid() is null or p_user_id = auth.uid() then raise exception 'Operação não permitida.' using errcode = '42501'; end if;
  select role into target_role from public.profiles where id = p_user_id for update;
  if target_role is null then raise exception 'Perfil não encontrado.' using errcode = '22023'; end if;
  if (select public.is_super_admin()) then
    if p_role not in ('super_admin', 'admin', 'manager', 'questionnaire_editor', 'participant', 'auditor') then raise exception 'Role inválida.' using errcode = '22023'; end if;
  elsif (select public.is_admin()) then
    if p_role not in ('admin', 'manager', 'questionnaire_editor', 'participant', 'auditor') or target_role = 'super_admin' then
      raise exception 'Somente superadministradores podem alterar esse nível de acesso.' using errcode = '42501';
    end if;
  else
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;
  if p_status not in ('invited', 'active', 'inactive') then raise exception 'Status inválido.' using errcode = '22023'; end if;
  update public.profiles set role = p_role, status = p_status, ativo = (p_status = 'active') where id = p_user_id;
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'profile.access_updated', jsonb_build_object('target_user_id', p_user_id, 'role', p_role, 'status', p_status));
end;
$$;

create or replace function public.assign_manager_to_team(p_manager_id uuid, p_team_id uuid, p_valid_from timestamptz, p_valid_until timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare assignment_uuid uuid;
begin
  if auth.uid() is null or not (select public.is_admin()) then raise exception 'Acesso administrativo necessário.' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_manager_id and role = 'manager' and status = 'active') then raise exception 'Gestor ativo não encontrado.' using errcode = '22023'; end if;
  insert into public.manager_team_assignments(manager_id, team_id, valid_from, valid_until, created_by)
  values (p_manager_id, p_team_id, p_valid_from, p_valid_until, auth.uid()) returning id into assignment_uuid;
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'manager.team_assigned', jsonb_build_object('manager_id', p_manager_id, 'team_id', p_team_id));
  return assignment_uuid;
end;
$$;

create or replace function public.create_questionnaire_version(p_questionnaire_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  next_version integer;
  new_version_id uuid;
  section_row record;
  question_row record;
  new_section_id uuid;
  new_question_id uuid;
begin
  if not (select public.can_manage_questionnaire(p_questionnaire_id)) then raise exception 'Sem permissão para versionar este questionário.' using errcode = '42501'; end if;
  select coalesce(max(version_number), 0) + 1 into next_version from public.questionnaire_versions where questionnaire_id = p_questionnaire_id;
  insert into public.questionnaire_versions(questionnaire_id, version_number, status)
  values (p_questionnaire_id, next_version, 'draft') returning id into new_version_id;
  for section_row in select s.* from public.questionnaire_sections s join public.questionnaire_versions v on v.id = s.version_id
    where v.questionnaire_id = p_questionnaire_id and v.status = 'published' order by s.display_order loop
    insert into public.questionnaire_sections(version_id, code, title, description, section_type, display_order, settings)
    values (new_version_id, section_row.code, section_row.title, section_row.description, section_row.section_type, section_row.display_order, section_row.settings)
    returning id into new_section_id;
    for question_row in select q.* from public.questions q where q.section_id = section_row.id order by q.ordem loop
      insert into public.questions(theme_id, section_id, numero, texto, tipo, ordem, obrigatoria, ativa, peso, dimension_code, settings)
      values (question_row.theme_id, new_section_id, question_row.numero, question_row.texto, question_row.tipo, question_row.ordem,
        question_row.obrigatoria, question_row.ativa, question_row.weight, question_row.dimension_code, question_row.settings)
      returning id into new_question_id;
      insert into public.question_options(question_id, label, score, display_order)
      select new_question_id, o.label, o.score, o.display_order from public.question_options o where o.question_id = question_row.id;
    end loop;
  end loop;
  return new_version_id;
end;
$$;

create or replace function public.publish_questionnaire_version(p_version_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare questionnaire_uuid uuid;
begin
  select questionnaire_id into questionnaire_uuid from public.questionnaire_versions where id = p_version_id and status = 'draft' for update;
  if questionnaire_uuid is null or not (select public.can_manage_questionnaire(questionnaire_uuid)) then raise exception 'Rascunho indisponível para publicação.' using errcode = '42501'; end if;
  if not exists (select 1 from public.questions q join public.questionnaire_sections s on s.id = q.section_id where s.version_id = p_version_id and q.ativa) then
    raise exception 'Adicione ao menos uma pergunta antes de publicar.' using errcode = '23514';
  end if;
  if exists (select 1 from public.questions q join public.questionnaire_sections s on s.id = q.section_id
    where s.version_id = p_version_id and q.ativa and q.tipo in ('escala','likert','escolha_unica','multipla_escolha')
    and (select count(*) from public.question_options o where o.question_id = q.id) < 2) then
    raise exception 'Perguntas de escolha precisam de pelo menos duas alternativas.' using errcode = '23514';
  end if;
  update public.questionnaire_versions set status = 'published', published_at = now(), published_by = auth.uid() where id = p_version_id;
  update public.questionnaire_versions set status = 'retired'
    where questionnaire_id = questionnaire_uuid and id <> p_version_id and status = 'published';
  update public.questionnaires set status = 'published' where id = questionnaire_uuid;
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'questionnaire.version_published', jsonb_build_object('questionnaire_id', questionnaire_uuid, 'version_id', p_version_id));
end;
$$;

create or replace function public.add_question_to_section(
  p_section_id uuid, p_text text, p_type text, p_required boolean, p_weight numeric,
  p_dimension_code text, p_options text[]
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  version_uuid uuid;
  next_order integer;
  question_uuid uuid;
  option_label text;
  option_order integer := 0;
begin
  select version_id into version_uuid from public.questionnaire_sections where id = p_section_id;
  if version_uuid is null or not (select public.version_is_editable(version_uuid)) then raise exception 'Seção sem permissão de edição.' using errcode = '42501'; end if;
  if length(trim(p_text)) not between 4 and 1000 or p_type not in ('escala','likert','escolha_unica','multipla_escolha','texto','numero','data','booleano') then
    raise exception 'Pergunta inválida.' using errcode = '22023';
  end if;
  if p_type in ('escala','likert','escolha_unica','multipla_escolha') and coalesce(array_length(p_options, 1), 0) < 2 then
    raise exception 'Informe ao menos duas alternativas.' using errcode = '22023';
  end if;
  if p_type in ('escala','likert') and array_length(p_options, 1) <> 5 then
    raise exception 'Escalas precisam ter exatamente cinco alternativas.' using errcode = '22023';
  end if;
  select coalesce(max(ordem), 0) + 1 into next_order from public.questions where section_id = p_section_id;
  insert into public.questions(section_id, numero, ordem, texto, tipo, obrigatoria, ativa, weight, dimension_code)
  values (p_section_id, next_order, next_order, trim(p_text), p_type, p_required, true, p_weight, nullif(trim(p_dimension_code), ''))
  returning id into question_uuid;
  if p_type in ('escala','likert','escolha_unica','multipla_escolha') then
    foreach option_label in array p_options loop
      option_order := option_order + 1;
      insert into public.question_options(question_id, label, score, display_order)
      values (question_uuid, trim(option_label), case when p_type in ('escala','likert') then option_order else null end, option_order);
    end loop;
  end if;
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'questionnaire.question_added', jsonb_build_object('section_id', p_section_id, 'question_id', question_uuid));
  return question_uuid;
end;
$$;

create or replace function public.create_questionnaire(p_title text, p_description text, p_slug text, p_visibility text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  questionnaire_uuid uuid;
  version_uuid uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p where p.id = auth.uid()
    and p.role in ('super_admin', 'admin', 'manager', 'questionnaire_editor') and p.status = 'active') then
    raise exception 'Perfil sem permissão para criar questionários.' using errcode = '42501';
  end if;
  if length(trim(p_title)) not between 2 and 160 or p_visibility not in ('private', 'team', 'organization') then
    raise exception 'Título ou visibilidade inválidos.' using errcode = '22023';
  end if;
  insert into public.questionnaires(title, description, slug, owner_id, status, visibility)
  values (trim(p_title), nullif(trim(p_description), ''), p_slug, auth.uid(), 'draft', p_visibility)
  returning id into questionnaire_uuid;
  insert into public.questionnaire_versions(questionnaire_id, version_number, status)
  values (questionnaire_uuid, 1, 'draft') returning id into version_uuid;
  insert into public.questionnaire_sections(version_id, code, title, section_type, display_order)
  values (version_uuid, 'MAIN', 'Perguntas', 'scored', 1);
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'questionnaire.created', jsonb_build_object('questionnaire_id', questionnaire_uuid));
  return questionnaire_uuid;
end;
$$;

create or replace function public.create_campaign(
  p_name text, p_description text, p_questionnaire_version_id uuid, p_team_ids uuid[],
  p_starts_at timestamptz, p_ends_at timestamptz, p_result_visibility text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  cycle_uuid uuid;
  campaign_uuid uuid;
  team_uuid uuid;
  active_now boolean;
begin
  if auth.uid() is null or not ((select public.is_admin()) or (select public.is_manager())) then raise exception 'Acesso de gestor necessário.' using errcode = '42501'; end if;
  if length(trim(p_name)) not between 2 and 160 or coalesce(array_length(p_team_ids, 1), 0) = 0 then raise exception 'Informe o nome e ao menos uma equipe.' using errcode = '22023'; end if;
  if p_result_visibility not in ('admin', 'manager', 'participant') then raise exception 'Visibilidade inválida.' using errcode = '22023'; end if;
  if not exists (select 1 from public.questionnaire_versions v where v.id = p_questionnaire_version_id and v.status = 'published') then raise exception 'Selecione uma versão publicada.' using errcode = '22023'; end if;
  foreach team_uuid in array p_team_ids loop
    if not (select public.manages_team(team_uuid)) then raise exception 'Equipe fora do seu escopo.' using errcode = '42501'; end if;
  end loop;
  active_now := p_starts_at <= now() and (p_ends_at is null or p_ends_at >= now());
  insert into public.assessment_cycles(titulo, descricao, data_inicio, data_fim, ativo)
  values (trim(p_name) || ' [' || substr(gen_random_uuid()::text, 1, 8) || ']', p_description, p_starts_at, p_ends_at, active_now) returning id into cycle_uuid;
  insert into public.campaigns(name, description, assessment_cycle_id, questionnaire_version_id, owner_id, starts_at, ends_at, status, result_visibility)
  values (trim(p_name), p_description, cycle_uuid, p_questionnaire_version_id, auth.uid(), p_starts_at, p_ends_at,
    case when p_starts_at > now() then 'scheduled' when p_ends_at < now() then 'closed' else 'active' end, p_result_visibility)
  returning id into campaign_uuid;
  insert into public.campaign_teams(campaign_id, team_id) select campaign_uuid, unnest(p_team_ids);
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'campaign.created', jsonb_build_object('campaign_id', campaign_uuid, 'teams', p_team_ids));
  return campaign_uuid;
end;
$$;

create or replace function public.assign_participant_to_campaign(p_campaign_id uuid, p_participant_id uuid, p_team_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare participant_uuid uuid;
begin
  if auth.uid() is null or not (select public.manages_team(p_team_id)) then raise exception 'Equipe fora do seu escopo.' using errcode = '42501'; end if;
  if not exists (select 1 from public.campaign_teams ct where ct.campaign_id = p_campaign_id and ct.team_id = p_team_id) then raise exception 'Equipe não pertence à campanha.' using errcode = '42501'; end if;
  if not exists (select 1 from public.team_members tm join public.profiles p on p.id = tm.user_id
    where tm.team_id = p_team_id and tm.user_id = p_participant_id and tm.active and p.role = 'participant' and p.status = 'active') then
    raise exception 'Participante ativo não está vinculado a esta equipe.' using errcode = '22023';
  end if;
  insert into public.campaign_participants(campaign_id, participant_id, team_id, assigned_by)
  values (p_campaign_id, p_participant_id, p_team_id, auth.uid())
  on conflict (campaign_id, participant_id) do update set team_id = excluded.team_id
  returning id into participant_uuid;
  insert into public.audit_logs(user_id, event_type, metadata)
  values (auth.uid(), 'campaign.participant_assigned', jsonb_build_object('campaign_id', p_campaign_id, 'participant_id', p_participant_id));
  return participant_uuid;
end;
$$;

create or replace function public.start_assessment(p_cycle_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  assessment_uuid uuid;
  participant_uuid uuid;
  campaign_version_uuid uuid;
  campaign_row record;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.ativo) then
    raise exception 'Conta ativa necessária.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.assessment_cycles c where c.id = p_cycle_id and c.ativo
    and c.data_inicio <= now() and (c.data_fim is null or c.data_fim >= now())) then raise exception 'Ciclo indisponível.' using errcode = '22023'; end if;
  select * into campaign_row from public.campaigns where assessment_cycle_id = p_cycle_id and status = 'active' limit 1;
  if found then
    campaign_version_uuid := campaign_row.questionnaire_version_id;
    if campaign_row.require_assignment then
      select cp.id into participant_uuid from public.campaign_participants cp
      where cp.campaign_id = campaign_row.id and cp.participant_id = auth.uid() and cp.status <> 'completed' for update;
      if participant_uuid is null then raise exception 'Você não está inscrito nesta campanha.' using errcode = '42501'; end if;
    end if;
  end if;
  insert into public.assessments(cycle_id, user_id, usuario_confirmado, campaign_participant_id, questionnaire_version_id)
  values (p_cycle_id, auth.uid(), true, participant_uuid, campaign_version_uuid)
  on conflict (cycle_id, user_id) do update set usuario_confirmado = true returning id into assessment_uuid;
  if participant_uuid is not null then update public.campaign_participants set status = 'in_progress' where id = participant_uuid; end if;
  return assessment_uuid;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, nome, email, role, status, ativo, created_by)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''), 'participant', 'invited', false, null)
  on conflict (id) do update set email = excluded.email;
  if new.email_confirmed_at is not null then perform public.accept_invitation_for_user(new.id, new.email); end if;
  return new;
end;
$$;

create or replace function public.accept_invitation_for_user(p_user_id uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare invite_row record;
begin
  select * into invite_row from public.invitations i
  where lower(i.email) = lower(p_email) and i.status = 'pending' and i.expires_at > now()
  order by i.created_at desc limit 1 for update skip locked;
  if not found then return; end if;
  update public.profiles set role = invite_row.role, status = 'active', ativo = true, created_by = invite_row.invited_by
  where id = p_user_id;
  update public.invitations set status = 'accepted', accepted_at = now() where id = invite_row.id;
  if invite_row.team_id is not null and invite_row.role = 'participant' then
    insert into public.team_members(team_id, user_id, created_by)
    values (invite_row.team_id, p_user_id, invite_row.invited_by)
    on conflict (team_id, user_id, started_at) do update set active = true, ended_at = null;
  elsif invite_row.team_id is not null and invite_row.role = 'manager' and not exists (
    select 1 from public.manager_team_assignments m where m.manager_id = p_user_id and m.team_id = invite_row.team_id and m.active and m.valid_until is null
  ) then
    insert into public.manager_team_assignments(manager_id, team_id, created_by)
    values (p_user_id, invite_row.team_id, invite_row.invited_by);
  end if;
  insert into public.audit_logs(user_id, event_type, metadata)
  values (invite_row.invited_by, 'invitation.accepted', jsonb_build_object('invitation_id', invite_row.id, 'profile_id', p_user_id));
end;
$$;

create or replace function public.accept_current_user_invitation()
returns void language plpgsql security definer set search_path = '' as $$
declare auth_email text; confirmed_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Sessão necessária.' using errcode = '42501'; end if;
  select email, email_confirmed_at into auth_email, confirmed_at from auth.users where id = auth.uid();
  if confirmed_at is not null then perform public.accept_invitation_for_user(auth.uid(), auth_email); end if;
end;
$$;

create or replace function public.accept_confirmed_user_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.accept_invitation_for_user(new.id, new.email);
  end if;
  return new;
end;
$$;
create trigger auth_user_email_confirmed after update of email_confirmed_at on auth.users
for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.accept_confirmed_user_invitation();

create or replace function public.prevent_published_section_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.questionnaire_versions v where v.id = old.version_id and v.status <> 'draft') then
    raise exception 'Seções publicadas são imutáveis; crie uma nova versão.' using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger sections_immutable_published before update or delete on public.questionnaire_sections
for each row execute function public.prevent_published_section_edit();

create or replace function public.prevent_published_option_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1
    from public.questions q
    join public.questionnaire_sections s on s.id = q.section_id
    join public.questionnaire_versions v on v.id = s.version_id
    where q.id = old.question_id and v.status <> 'draft'
  ) then
    raise exception 'Versões publicadas são imutáveis; crie uma nova versão.' using errcode = '55000';
  end if;
  if tg_op = 'UPDATE' and exists (
    select 1
    from public.questions q
    join public.questionnaire_sections s on s.id = q.section_id
    join public.questionnaire_versions v on v.id = s.version_id
    where q.id = new.question_id and v.status <> 'draft'
  ) then
    raise exception 'Versões publicadas são imutáveis; crie uma nova versão.' using errcode = '55000';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger options_immutable_published before update or delete on public.question_options
for each row execute function public.prevent_published_option_edit();

create or replace function public.save_scale_answer(p_assessment_id uuid, p_question_id uuid, p_score smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare version_uuid uuid;
begin
  if auth.uid() is null or p_score not between 1 and 5 then raise exception 'Resposta inválida.' using errcode = '22023'; end if;
  select questionnaire_version_id into version_uuid from public.assessments where id = p_assessment_id
    and user_id = auth.uid() and usuario_confirmado and status in ('iniciada','em_andamento');
  if not found then raise exception 'Avaliação indisponível para edição.' using errcode = '42501'; end if;
  if not exists (select 1 from public.questions q where q.id = p_question_id and q.tipo = 'escala' and q.ativa
    and (version_uuid is null or exists (select 1 from public.questionnaire_sections s where s.id = q.section_id and s.version_id = version_uuid))) then
    raise exception 'Pergunta não pertence à versão da avaliação.' using errcode = '22023';
  end if;
  insert into public.answers(assessment_id, question_id, score) values (p_assessment_id, p_question_id, p_score)
  on conflict (assessment_id, question_id) do update set score = excluded.score;
  update public.assessments set status = 'em_andamento' where id = p_assessment_id;
end;
$$;

create or replace function public.save_text_answer(p_assessment_id uuid, p_question_id uuid, p_answer_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare version_uuid uuid;
begin
  if auth.uid() is null then raise exception 'Sessão necessária.' using errcode = '42501'; end if;
  if length(coalesce(p_answer_text, '')) > 10000 then raise exception 'Resposta excede o limite.' using errcode = '22023'; end if;
  select questionnaire_version_id into version_uuid from public.assessments where id = p_assessment_id
    and user_id = auth.uid() and usuario_confirmado and status in ('iniciada','em_andamento');
  if not found then raise exception 'Avaliação indisponível para edição.' using errcode = '42501'; end if;
  if not exists (select 1 from public.questions q where q.id = p_question_id and q.tipo = 'texto' and q.ativa
    and (version_uuid is null or exists (select 1 from public.questionnaire_sections s where s.id = q.section_id and s.version_id = version_uuid))) then
    raise exception 'Pergunta não pertence à versão da avaliação.' using errcode = '22023';
  end if;
  insert into public.text_answers(assessment_id, question_id, answer_text)
  values (p_assessment_id, p_question_id, trim(coalesce(p_answer_text, '')))
  on conflict (assessment_id, question_id) do update set answer_text = excluded.answer_text;
  update public.assessments set status = 'em_andamento' where id = p_assessment_id;
end;
$$;

create or replace function public.save_question_answer(p_assessment_id uuid, p_question_id uuid, p_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  assessment_version uuid;
  question_type text;
  answer_uuid uuid;
  selected_option uuid;
  option_ids uuid[];
  numeric_answer numeric;
  date_answer date;
  boolean_answer boolean;
  raw_value text;
begin
  select questionnaire_version_id into assessment_version from public.assessments
  where id = p_assessment_id and user_id = auth.uid() and usuario_confirmado and status in ('iniciada','em_andamento');
  if not found or auth.uid() is null then raise exception 'Avaliação indisponível para edição.' using errcode = '42501'; end if;
  select q.tipo into question_type from public.questions q
  where q.id = p_question_id and q.ativa and (assessment_version is null or exists (
    select 1 from public.questionnaire_sections s where s.id = q.section_id and s.version_id = assessment_version
  ));
  if question_type is null or question_type in ('texto','escala') then raise exception 'Tipo de pergunta inválido para esta resposta.' using errcode = '22023'; end if;
  if question_type = 'likert' then
    raw_value := p_value ->> 'score';
    if raw_value !~ '^[1-5]$' then raise exception 'Seleção inválida.' using errcode = '22023'; end if;
    select id into selected_option from public.question_options where question_id = p_question_id and score = raw_value::numeric limit 1;
    if selected_option is null then raise exception 'Alternativa inválida.' using errcode = '22023'; end if;
  elsif question_type = 'escolha_unica' then
    selected_option := (p_value ->> 'optionId')::uuid;
    if not exists (select 1 from public.question_options where id = selected_option and question_id = p_question_id) then raise exception 'Alternativa inválida.' using errcode = '22023'; end if;
  elsif question_type = 'multipla_escolha' then
    select array_agg(value::uuid) into option_ids from jsonb_array_elements_text(p_value -> 'optionIds') as value;
    if coalesce(array_length(option_ids, 1), 0) = 0 or exists (
      select 1 from unnest(option_ids) selected(id) where not exists (select 1 from public.question_options o where o.id = selected.id and o.question_id = p_question_id)
    ) then raise exception 'Alternativas inválidas.' using errcode = '22023'; end if;
    selected_option := option_ids[1];
  elsif question_type = 'numero' then
    numeric_answer := (p_value ->> 'value')::numeric;
    if numeric_answer is null then raise exception 'Número inválido.' using errcode = '22023'; end if;
  elsif question_type = 'data' then
    date_answer := (p_value ->> 'value')::date;
  elsif question_type = 'booleano' then
    boolean_answer := (p_value ->> 'value')::boolean;
  else
    raise exception 'Tipo não suportado.' using errcode = '22023';
  end if;
  insert into public.answers(assessment_id, question_id, selected_option_id, numeric_value, boolean_value, date_value)
  values (p_assessment_id, p_question_id, selected_option, numeric_answer, boolean_answer, date_answer)
  on conflict (assessment_id, question_id) do update set score = null, selected_option_id = excluded.selected_option_id,
    numeric_value = excluded.numeric_value, text_value = null, boolean_value = excluded.boolean_value, date_value = excluded.date_value
  returning id into answer_uuid;
  if question_type = 'multipla_escolha' then
    delete from public.answer_option_selections where answer_id = answer_uuid;
    insert into public.answer_option_selections(answer_id, option_id) select answer_uuid, unnest(option_ids);
  else
    delete from public.answer_option_selections where answer_id = answer_uuid;
  end if;
  update public.assessments set status = 'em_andamento' where id = p_assessment_id;
end;
$$;

create or replace function public.complete_assessment(p_assessment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  assessment_row public.assessments%rowtype;
  missing_count integer;
  is_disc boolean;
  scores integer[];
  dominant_profile text;
  dimensions jsonb;
  total numeric;
  dominant_dimension text;
  weighted_result numeric(5,2);
  competency_classification text;
begin
  select * into assessment_row from public.assessments where id = p_assessment_id and user_id = auth.uid() for update;
  if not found or not assessment_row.usuario_confirmado or assessment_row.status not in ('iniciada', 'em_andamento') then raise exception 'Avaliação indisponível para envio.' using errcode = '42501'; end if;
  select count(*) into missing_count from public.questions q where q.ativa and q.obrigatoria
    and (assessment_row.questionnaire_version_id is null or exists (select 1 from public.questionnaire_sections s
      where s.id = q.section_id and s.version_id = assessment_row.questionnaire_version_id))
    and ((q.tipo = 'texto' and not exists (select 1 from public.text_answers t where t.assessment_id = p_assessment_id and t.question_id = q.id and length(trim(t.answer_text)) > 0))
      or (q.tipo <> 'texto' and not exists (select 1 from public.answers a where a.assessment_id = p_assessment_id and a.question_id = q.id and (a.score is not null or a.selected_option_id is not null or a.numeric_value is not null or a.boolean_value is not null or a.date_value is not null))));
  if missing_count > 0 then raise exception 'Responda todas as perguntas obrigatórias.' using errcode = '23514'; end if;
  select exists (select 1 from public.questionnaire_versions v join public.questionnaires n on n.id = v.questionnaire_id
    where v.id = assessment_row.questionnaire_version_id and n.slug = 'disc-competencias-operacionais') into is_disc;
  if is_disc or assessment_row.questionnaire_version_id is null then
    select array_agg(sum_score order by theme_order) into scores from (
      select t.ordem theme_order, sum(a.score)::integer sum_score from public.themes t
      join public.questions q on q.theme_id = t.id and q.tipo = 'escala' and q.ativa
      join public.answers a on a.question_id = q.id and a.assessment_id = p_assessment_id
      group by t.id, t.ordem
    ) score_rows;
    if coalesce(array_length(scores, 1), 0) <> 8 then raise exception 'Configuração DISC inválida.' using errcode = '23514'; end if;
    select codigo into dominant_profile from (
      select t.codigo, sum(a.score)::integer total from public.themes t
      join public.questions q on q.theme_id = t.id and q.tipo = 'escala'
      join public.answers a on a.question_id = q.id and a.assessment_id = p_assessment_id
      where t.codigo in ('D','I','S','C') group by t.codigo
    ) d order by total desc, case codigo when 'D' then 1 when 'I' then 2 when 'S' then 3 else 4 end limit 1;
    total := scores[5] + scores[6] + scores[7] + scores[8];
    weighted_result := round(((scores[1] + scores[2] + scores[3] + scores[4])::numeric / 100 * 20)
      + (scores[5]::numeric / 25 * 30) + (scores[6]::numeric / 25 * 20)
      + (scores[7]::numeric / 25 * 20) + (scores[8]::numeric / 25 * 10), 2);
    competency_classification := case when total >= 81 then 'Excelente' when total >= 61 then 'Muito Bom'
      when total >= 41 then 'Adequado' else 'Requer Desenvolvimento' end;
    insert into public.assessment_results(assessment_id, dominancia, influencia, estabilidade, conformidade,
      seguranca, disciplina, trabalho_equipe, comunicacao, indice_competencias, perfil_predominante,
      resultado_ponderado, classificacao_competencias, faixas_disc, recomendacao)
    values (p_assessment_id, scores[1], scores[2], scores[3], scores[4], scores[5], scores[6], scores[7], scores[8], total,
      dominant_profile, weighted_result, competency_classification,
      jsonb_build_object(
        'D', case when scores[1] >= 21 then 'Perfil Muito Forte' when scores[1] >= 16 then 'Perfil Forte' when scores[1] >= 11 then 'Perfil Moderado' else 'Perfil Pouco Evidente' end,
        'I', case when scores[2] >= 21 then 'Perfil Muito Forte' when scores[2] >= 16 then 'Perfil Forte' when scores[2] >= 11 then 'Perfil Moderado' else 'Perfil Pouco Evidente' end,
        'S', case when scores[3] >= 21 then 'Perfil Muito Forte' when scores[3] >= 16 then 'Perfil Forte' when scores[3] >= 11 then 'Perfil Moderado' else 'Perfil Pouco Evidente' end,
        'C', case when scores[4] >= 21 then 'Perfil Muito Forte' when scores[4] >= 16 then 'Perfil Forte' when scores[4] >= 11 then 'Perfil Moderado' else 'Perfil Pouco Evidente' end),
      case dominant_profile when 'D' then 'Liderança de DDS, coordenação de melhorias'
        when 'I' then 'Multiplicador de treinamentos e integração'
        when 'S' then 'Padronização operacional e mentorias'
        when 'C' then 'Auditorias, qualidade e análise de riscos' end)
    on conflict (assessment_id) do nothing;
  else
      select coalesce(jsonb_object_agg(dimension_code, score), '{}'::jsonb), coalesce(sum(score), 0),
      (array_agg(dimension_code order by score desc))[1]
    into dimensions, total, dominant_dimension from (
      select coalesce(q.dimension_code, 'geral') as dimension_code,
        sum(case when q.tipo = 'multipla_escolha' then coalesce((
          select sum(selected_option.score)
          from public.answer_option_selections selection
          join public.question_options selected_option on selected_option.id = selection.option_id
          where selection.answer_id = a.id
        ), 0) else coalesce(a.score, o.score, a.numeric_value, 0) end * q.weight) score
      from public.questions q join public.questionnaire_sections s on s.id = q.section_id
      left join public.answers a on a.question_id = q.id and a.assessment_id = p_assessment_id
      left join public.question_options o on o.id = a.selected_option_id
      where s.version_id = assessment_row.questionnaire_version_id and q.ativa group by coalesce(q.dimension_code, 'geral')
    ) d;
    insert into public.questionnaire_results(assessment_id, total_score, dimensions, dominant_dimension)
    values (p_assessment_id, total, dimensions, dominant_dimension) on conflict (assessment_id) do nothing;
  end if;
  update public.assessments set status = 'concluida', concluida_em = now() where id = p_assessment_id;
  if assessment_row.campaign_participant_id is not null then update public.campaign_participants set status = 'completed' where id = assessment_row.campaign_participant_id; end if;
end;
$$;

grant execute on function public.create_team(text, text, text, uuid) to authenticated;
grant execute on function public.set_profile_access(uuid, text, text) to authenticated;
grant execute on function public.assign_manager_to_team(uuid, uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.create_questionnaire_version(uuid) to authenticated;
grant execute on function public.publish_questionnaire_version(uuid) to authenticated;
grant execute on function public.add_question_to_section(uuid, text, text, boolean, numeric, text, text[]) to authenticated;
grant execute on function public.create_questionnaire(text, text, text, text) to authenticated;
grant execute on function public.create_campaign(text, text, uuid, uuid[], timestamptz, timestamptz, text) to authenticated;
grant execute on function public.assign_participant_to_campaign(uuid, uuid, uuid) to authenticated;

revoke all on function public.create_team(text, text, text, uuid) from public, anon;
revoke all on function public.set_profile_access(uuid, text, text) from public, anon;
revoke all on function public.assign_manager_to_team(uuid, uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.create_questionnaire_version(uuid) from public, anon;
revoke all on function public.publish_questionnaire_version(uuid) from public, anon;
revoke all on function public.add_question_to_section(uuid, text, text, boolean, numeric, text, text[]) from public, anon;
revoke all on function public.create_questionnaire(text, text, text, text) from public, anon;
revoke all on function public.create_campaign(text, text, uuid, uuid[], timestamptz, timestamptz, text) from public, anon;
revoke all on function public.assign_participant_to_campaign(uuid, uuid, uuid) from public, anon;
revoke all on function public.start_assessment(uuid) from public, anon;
revoke all on function public.complete_assessment(uuid) from public, anon;
grant execute on function public.create_team(text, text, text, uuid) to authenticated;
grant execute on function public.set_profile_access(uuid, text, text) to authenticated;
grant execute on function public.assign_manager_to_team(uuid, uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.create_questionnaire_version(uuid) to authenticated;
grant execute on function public.publish_questionnaire_version(uuid) to authenticated;
grant execute on function public.add_question_to_section(uuid, text, text, boolean, numeric, text, text[]) to authenticated;
grant execute on function public.create_questionnaire(text, text, text, text) to authenticated;
grant execute on function public.create_campaign(text, text, uuid, uuid[], timestamptz, timestamptz, text) to authenticated;
grant execute on function public.assign_participant_to_campaign(uuid, uuid, uuid) to authenticated;
grant execute on function public.start_assessment(uuid) to authenticated;
grant execute on function public.complete_assessment(uuid) to authenticated;

drop policy invitations_insert_scoped on public.invitations;
create policy invitations_insert_scoped on public.invitations for insert to authenticated
with check ((select public.is_admin()) or (invited_by = (select auth.uid()) and role = 'participant' and (select public.manages_team(team_id))));

create or replace view public.admin_assessment_results with (security_invoker = true) as
select a.id as assessment_id, a.cycle_id, a.user_id, p.nome as participante, p.email, p.matricula,
  p.funcao, p.equipe, p.gestor, a.status, a.iniciada_em, a.concluida_em,
  r.dominancia, r.influencia, r.estabilidade, r.conformidade, r.seguranca, r.disciplina,
  r.trabalho_equipe, r.comunicacao, r.indice_competencias, r.perfil_predominante,
  r.resultado_ponderado, r.classificacao_competencias, r.faixas_disc, r.recomendacao,
  qr.total_score, qr.dimensions, qr.dominant_dimension
from public.assessments a join public.profiles p on p.id = a.user_id
left join public.assessment_results r on r.assessment_id = a.id
left join public.questionnaire_results qr on qr.assessment_id = a.id;

grant execute on function public.start_assessment(uuid) to authenticated;
grant execute on function public.complete_assessment(uuid) to authenticated;
grant execute on function public.save_scale_answer(uuid, uuid, smallint) to authenticated;
grant execute on function public.save_text_answer(uuid, uuid, text) to authenticated;
grant execute on function public.save_question_answer(uuid, uuid, jsonb) to authenticated;
revoke all on function public.save_scale_answer(uuid, uuid, smallint) from public, anon;
revoke all on function public.save_text_answer(uuid, uuid, text) from public, anon;
revoke all on function public.save_question_answer(uuid, uuid, jsonb) from public, anon;
revoke all on function public.add_team_member(uuid, uuid) from public, anon;
revoke all on function public.can_access_questionnaire(uuid) from public, anon;
grant execute on function public.save_scale_answer(uuid, uuid, smallint) to authenticated;
grant execute on function public.save_text_answer(uuid, uuid, text) to authenticated;
grant execute on function public.save_question_answer(uuid, uuid, jsonb) to authenticated;
grant execute on function public.add_team_member(uuid, uuid) to authenticated;
grant execute on function public.can_access_questionnaire(uuid) to authenticated;
revoke all on function public.accept_invitation_for_user(uuid, text) from public, anon, authenticated;
revoke all on function public.accept_current_user_invitation() from public, anon;
grant execute on function public.accept_current_user_invitation() to authenticated;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_manager() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.is_auditor() from public, anon;
revoke all on function public.manages_team(uuid) from public, anon;
revoke all on function public.can_access_participant(uuid) from public, anon;
revoke all on function public.can_manage_questionnaire(uuid) from public, anon;
revoke all on function public.version_is_editable(uuid) from public, anon;
revoke all on function public.can_access_questionnaire(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_auditor() to authenticated;
grant execute on function public.manages_team(uuid) to authenticated;
grant execute on function public.can_access_participant(uuid) to authenticated;
grant execute on function public.can_manage_questionnaire(uuid) to authenticated;
grant execute on function public.version_is_editable(uuid) to authenticated;
grant execute on function public.can_access_questionnaire(uuid) to authenticated;

-- ===== supabase/seed.sql =====

insert into public.assessment_cycles (titulo, descricao, data_inicio, ativo)
values ('Avaliação DISC e Competências Operacionais', 'Ciclo inicial de autoavaliação comportamental e operacional.', now(), true)
on conflict ((lower(titulo))) do nothing;

insert into public.themes (codigo, nome, descricao, ordem, tipo, peso, ativo) values
('D', 'Dominância', 'Avalie como você toma decisões, assume responsabilidades, enfrenta problemas e busca resultados.', 1, 'disc', 1, true),
('I', 'Influência', 'Avalie sua comunicação, participação, motivação e interação com outras pessoas.', 2, 'disc', 1, true),
('S', 'Estabilidade', 'Avalie sua calma, cooperação, confiança e equilíbrio diante das situações de trabalho.', 3, 'disc', 1, true),
('C', 'Conformidade', 'Avalie sua atenção aos detalhes, análise de riscos, qualidade e cumprimento de procedimentos.', 4, 'disc', 1, true),
('SEG', 'Segurança', 'Avalie seus comportamentos relacionados à prevenção, uso de EPIs e comunicação de riscos.', 5, 'competencia', 1, true),
('DIS', 'Disciplina Operacional', 'Avalie o cumprimento de padrões, procedimentos, horários, registros e inspeções.', 6, 'competencia', 1, true),
('TE', 'Trabalho em Equipe', 'Avalie sua cooperação, compartilhamento de conhecimento e contribuição para resultados coletivos.', 7, 'competencia', 1, true),
('COM', 'Comunicação', 'Avalie a clareza, agilidade, escuta e qualidade dos registros e retornos.', 8, 'competencia', 1, true)
on conflict (codigo) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem,
  tipo = excluded.tipo, peso = excluded.peso, ativo = excluded.ativo;

with seed_questions(numero, codigo, texto) as (values
(1, 'D', 'Tomo iniciativa quando surge um problema operacional.'),
(2, 'D', 'Consigo decidir rapidamente em situações críticas.'),
(3, 'D', 'Gosto de assumir responsabilidades por resultados.'),
(4, 'D', 'Sinto-me confortável liderando atividades da equipe.'),
(5, 'D', 'Busco soluções mesmo quando não existem procedimentos claros.'),
(6, 'I', 'Compartilho informações de forma espontânea com a equipe.'),
(7, 'I', 'Tenho facilidade para me comunicar com diferentes pessoas.'),
(8, 'I', 'Costumo motivar colegas durante atividades difíceis.'),
(9, 'I', 'Gosto de participar de reuniões e discussões de melhorias.'),
(10, 'I', 'Sou procurado pelos colegas para orientação ou apoio.'),
(11, 'S', 'Mantenho a calma diante de situações de pressão.'),
(12, 'S', 'Trabalho bem em equipe.'),
(13, 'S', 'Respeito processos e rotinas estabelecidas.'),
(14, 'S', 'Procuro evitar conflitos desnecessários.'),
(15, 'S', 'Sou visto como uma pessoa confiável pela equipe.'),
(16, 'C', 'Sigo procedimentos operacionais rigorosamente.'),
(17, 'C', 'Tenho atenção aos detalhes das atividades.'),
(18, 'C', 'Analiso riscos antes de executar uma tarefa.'),
(19, 'C', 'Registro informações corretamente.'),
(20, 'C', 'Preocupo-me com qualidade e conformidade dos serviços.'),
(21, 'SEG', 'Utilizo corretamente todos os EPIs necessários.'),
(22, 'SEG', 'Interrompo atividades quando identifico riscos.'),
(23, 'SEG', 'Conheço os procedimentos de segurança da minha área.'),
(24, 'SEG', 'Reporto desvios de segurança imediatamente.'),
(25, 'SEG', 'Sou exemplo de comportamento seguro para a equipe.'),
(26, 'DIS', 'Cumpro procedimentos sem realizar atalhos.'),
(27, 'DIS', 'Mantenho registros atualizados.'),
(28, 'DIS', 'Cumpro horários e rotinas estabelecidas.'),
(29, 'DIS', 'Realizo inspeções conforme determinado.'),
(30, 'DIS', 'Sigo padrões definidos para execução das atividades.'),
(31, 'TE', 'Coopero com colegas quando necessário.'),
(32, 'TE', 'Compartilho conhecimento e experiências.'),
(33, 'TE', 'Contribuo para resolução de problemas coletivos.'),
(34, 'TE', 'Respeito opiniões diferentes.'),
(35, 'TE', 'Ajudo novos colaboradores na adaptação à área.'),
(36, 'COM', 'Comunico desvios e anomalias rapidamente.'),
(37, 'COM', 'Dou retorno quando recebo uma solicitação.'),
(38, 'COM', 'Escuto atentamente antes de responder.'),
(39, 'COM', 'Expresso ideias de maneira clara.'),
(40, 'COM', 'Registro informações importantes adequadamente.')
)
insert into public.questions (theme_id, numero, texto, tipo, ordem, obrigatoria, ativa)
select t.id, q.numero, q.texto, 'escala', q.numero, true, true
from seed_questions q join public.themes t on t.codigo = q.codigo
where not exists (
  select 1 from public.questions existing
  where existing.numero = q.numero and existing.theme_id = t.id
    and existing.tipo = 'escala' and existing.texto = q.texto
);

insert into public.questions (theme_id, numero, texto, tipo, ordem, obrigatoria, ativa)
select t.id, q.numero, q.texto, 'texto', q.numero, true, true
from (values
  (41, 'Qual foi sua principal contribuição para a equipe nos últimos 6 meses?'),
  (42, 'Qual comportamento precisa melhorar?'),
  (43, 'Qual treinamento considera mais importante para seu desenvolvimento?'),
  (44, 'Que sugestão de melhoria você daria para sua área?'),
  (45, 'Quais metas pessoais deseja alcançar nos próximos 12 meses?')
) as q(numero, texto)
cross join public.themes t
where t.codigo = 'COM'
  and not exists (
    select 1 from public.questions existing
    where existing.numero = q.numero and existing.tipo = 'texto' and existing.texto = q.texto
      and (existing.theme_id = t.id or existing.dimension_code = 'REF')
  );



insert into public.questionnaires (title, description, slug, owner_id, status, visibility, settings)
values ('DISC e Competências Operacionais', 'Modelo inicial com autoavaliação comportamental e competências operacionais.',
  'disc-competencias-operacionais', null, 'draft', 'organization',
  '{"showProgress":true,"oneQuestionPerPage":true,"allowBack":true,"shuffleQuestions":false,"shuffleOptions":false,"showResultsToParticipant":false}'::jsonb)
on conflict (slug) do update set description = excluded.description, visibility = excluded.visibility,
  settings = excluded.settings;

insert into public.questionnaire_versions (questionnaire_id, version_number, status)
select questionnaire.id, 1, 'draft'
from public.questionnaires questionnaire
where questionnaire.slug = 'disc-competencias-operacionais'
on conflict (questionnaire_id, version_number) do nothing;

insert into public.questionnaire_sections (version_id, code, title, description, section_type, display_order)
select v.id, section.code, section.title, section.description, section.section_type, section.display_order
from public.questionnaire_versions v
join public.questionnaires n on n.id = v.questionnaire_id and n.slug = 'disc-competencias-operacionais'
cross join (values
  ('D', 'Dominância', 'Decisões, iniciativa e orientação a resultados.', 'scored', 1),
  ('I', 'Influência', 'Comunicação, motivação e interação.', 'scored', 2),
  ('S', 'Estabilidade', 'Cooperação, confiança e equilíbrio.', 'scored', 3),
  ('C', 'Conformidade', 'Atenção, qualidade e procedimentos.', 'scored', 4),
  ('SEG', 'Segurança', 'Prevenção, EPIs e comunicação de riscos.', 'scored', 5),
  ('DIS', 'Disciplina Operacional', 'Padrões, rotinas, registros e inspeções.', 'scored', 6),
  ('TE', 'Trabalho em Equipe', 'Cooperação e resultados coletivos.', 'scored', 7),
  ('COM', 'Comunicação', 'Clareza, escuta e qualidade dos registros.', 'scored', 8),
  ('REF', 'Autoavaliação Reflexiva', 'Perguntas abertas para reflexão e desenvolvimento.', 'reflection', 9)
) as section(code, title, description, section_type, display_order)
where v.version_number = 1
on conflict (version_id, code) do nothing;

update public.questions q set
  theme_id = case when s.code = 'REF' then null else t.id end,
  section_id = s.id,
  dimension_code = coalesce(t.codigo, 'REF')
from public.questionnaire_sections s
join public.questionnaire_versions v on v.id = s.version_id and v.version_number = 1
join public.questionnaires n on n.id = v.questionnaire_id and n.slug = 'disc-competencias-operacionais'
left join public.themes t on t.codigo = s.code
where ((q.theme_id = t.id and t.id is not null) or (q.numero between 41 and 45 and s.code = 'REF'))
  and q.section_id is distinct from s.id;

insert into public.question_options (question_id, label, score, display_order)
select q.id, option.label, option.score, option.display_order
from public.questions q
cross join (values
  ('Nunca', 1, 1), ('Raramente', 2, 2), ('Às vezes', 3, 3),
  ('Frequentemente', 4, 4), ('Sempre', 5, 5)
) as option(label, score, display_order)
where q.tipo = 'escala'
on conflict (question_id, display_order) do nothing;

update public.questionnaire_versions set status = 'published', published_at = coalesce(published_at, now())
where version_number = 1 and questionnaire_id = (
  select questionnaire.id
  from public.questionnaires questionnaire
  where questionnaire.slug = 'disc-competencias-operacionais'
);
update public.questionnaires set status = 'published'
where slug = 'disc-competencias-operacionais';

insert into public.campaigns(name, description, assessment_cycle_id, questionnaire_version_id, owner_id,
  starts_at, status, result_visibility, require_assignment)
select c.titulo, c.descricao, c.id, v.id, null, c.data_inicio, 'active', 'admin', false
from public.assessment_cycles c
join public.questionnaires q on q.slug = 'disc-competencias-operacionais'
join public.questionnaire_versions v on v.questionnaire_id = q.id and v.version_number = 1
where lower(c.titulo) = lower('Avaliação DISC e Competências Operacionais')
on conflict (assessment_cycle_id) do update set questionnaire_version_id = excluded.questionnaire_version_id,
  status = 'active', result_visibility = 'admin';

COMMIT;