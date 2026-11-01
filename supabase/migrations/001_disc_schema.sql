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