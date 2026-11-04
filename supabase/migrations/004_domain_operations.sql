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
      insert into public.questions(theme_id, section_id, numero, texto, tipo, ordem, obrigatoria, ativa, weight, dimension_code, settings)
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
  latest_completed_at timestamptz;
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
  if not exists (
    select 1 from public.assessments a
    where a.user_id = auth.uid() and a.cycle_id = p_cycle_id
      and a.status in ('iniciada', 'em_andamento')
  ) then
    if exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'participant') then
      select max(a.concluida_em) into latest_completed_at
      from public.assessments a
      where a.user_id = auth.uid() and a.status = 'concluida';

      if latest_completed_at > now() - interval '3 months' then
        raise exception 'Você poderá iniciar uma nova avaliação em %.',
          to_char(latest_completed_at + interval '3 months', 'DD/MM/YYYY')
          using errcode = '22023';
      end if;
    end if;

    if exists (
      select 1 from public.assessments a
      where a.user_id = auth.uid() and a.cycle_id = p_cycle_id and a.status = 'concluida'
    ) then
      raise exception 'Esta avaliação já foi concluída neste ciclo. Aguarde uma nova campanha.'
        using errcode = '22023';
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
    ) d order by d.total desc, case d.codigo when 'D' then 1 when 'I' then 2 when 'S' then 3 else 4 end limit 1;
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