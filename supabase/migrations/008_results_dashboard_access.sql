create table public.disc_profile_catalog (
  code text primary key check (code in ('D', 'I', 'S', 'C')),
  name text not null,
  description text not null,
  traits text[] not null default '{}',
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order smallint not null,
  action_recommendation text not null
);

alter table public.disc_profile_catalog enable row level security;
create policy disc_profile_catalog_read on public.disc_profile_catalog
  for select to authenticated using (true);
revoke all on public.disc_profile_catalog from anon, authenticated;
grant select on public.disc_profile_catalog to authenticated;

insert into public.disc_profile_catalog (code, name, description, traits, color, sort_order, action_recommendation)
values
  ('D', 'Perfil Dominante', 'Tende a tomar iniciativa, decidir com agilidade e buscar soluções orientadas a resultados.', array['Direto', 'Decidido', 'Proativo', 'Resolutivo'], '#F05E61', 1, 'Liderança de DDS, coordenação de melhorias'),
  ('I', 'Perfil Influente', 'Tende a compartilhar informações, mobilizar pessoas e contribuir para a comunicação da equipe.', array['Comunicativo', 'Colaborativo', 'Entusiasta', 'Agregador'], '#F6CA56', 2, 'Multiplicador de treinamentos e integração'),
  ('S', 'Perfil Estável', 'Demonstra constância, confiabilidade e foco em manter um ambiente de trabalho harmonioso.', array['Calmo', 'Colaborativo', 'Confiável', 'Persistente'], '#18A66A', 3, 'Padronização operacional e mentorias'),
  ('C', 'Perfil Conforme', 'Tende a valorizar precisão, análise de riscos, qualidade e cumprimento cuidadoso de procedimentos.', array['Analítico', 'Preciso', 'Cuidadoso', 'Criterioso'], '#408AE5', 4, 'Auditorias, qualidade e análise de riscos')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  traits = excluded.traits,
  color = excluded.color,
  sort_order = excluded.sort_order,
  action_recommendation = excluded.action_recommendation;

create or replace function public.can_view_assessment(p_assessment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assessments a
    where a.id = p_assessment_id and (
      a.user_id = (select auth.uid())
      or (select public.is_admin())
      or (a.status = 'concluida' and (select public.is_manager()) and exists (
        select 1 from public.team_members tm
        where tm.user_id = a.user_id and tm.active and (select public.manages_team(tm.team_id))
      ))
    )
  );
$$;

create or replace function public.can_view_question(p_question_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.questions q
    join public.assessments a on
      a.questionnaire_version_id is null
      or exists (
        select 1 from public.questionnaire_sections s
        where s.id = q.section_id and s.version_id = a.questionnaire_version_id
      )
    where q.id = p_question_id and (select public.can_view_assessment(a.id))
  );
$$;

create or replace function public.team_assessment_progress(p_team_id uuid default null)
returns table (
  team_id uuid,
  team_name text,
  user_id uuid,
  participant_name text,
  matricula text,
  funcao text,
  assessment_id uuid,
  status text,
  answered_required integer,
  total_required integer,
  completion_percent integer,
  concluded_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  with active_members as (
    select distinct tm.team_id, tm.user_id
    from public.team_members tm
    join public.teams t on t.id = tm.team_id and t.active
    where tm.active
      and (p_team_id is null or tm.team_id = p_team_id)
      and ((select public.is_admin()) or ((select public.is_manager()) and (select public.manages_team(tm.team_id))))
  )
  select
    t.id,
    t.name,
    p.id,
    p.nome,
    p.matricula,
    p.funcao,
    latest.id,
    latest.status,
    coalesce(progress.answered_required, 0)::integer,
    coalesce(progress.total_required, 0)::integer,
    case
      when latest.id is null then 0
      when latest.status = 'concluida' then 100
      when coalesce(progress.total_required, 0) = 0 then 0
      else least(100, floor(100.0 * progress.answered_required / progress.total_required)::integer)
    end,
    latest.concluida_em
  from active_members member
  join public.teams t on t.id = member.team_id
  join public.profiles p on p.id = member.user_id
  left join lateral (
    select a.id, a.status, a.concluida_em, a.questionnaire_version_id
    from public.assessments a
    where a.user_id = member.user_id and a.status <> 'cancelada'
    order by a.created_at desc
    limit 1
  ) latest on true
  left join lateral (
    select
      (count(q.id) filter (where q.obrigatoria))::integer as total_required,
      (count(q.id) filter (
        where q.obrigatoria and (
          (q.tipo = 'texto' and text_answer.id is not null and length(trim(text_answer.answer_text)) > 0)
          or (q.tipo <> 'texto' and answer.id is not null and (
            answer.score is not null or answer.selected_option_id is not null or answer.numeric_value is not null
            or answer.boolean_value is not null or answer.date_value is not null
          ))
        )
      ))::integer as answered_required
    from public.questions q
    left join public.answers answer on answer.assessment_id = latest.id and answer.question_id = q.id
    left join public.text_answers text_answer on text_answer.assessment_id = latest.id and text_answer.question_id = q.id
    where latest.id is not null and q.ativa and (
      latest.questionnaire_version_id is null
      or exists (
        select 1 from public.questionnaire_sections s
        where s.id = q.section_id and s.version_id = latest.questionnaire_version_id
      )
    )
  ) progress on true
  order by t.name, p.nome;
$$;

revoke all on function public.can_view_assessment(uuid) from public, anon;
revoke all on function public.can_view_question(uuid) from public, anon;
revoke all on function public.team_assessment_progress(uuid) from public, anon;
grant execute on function public.can_view_assessment(uuid) to authenticated;
grant execute on function public.can_view_question(uuid) to authenticated;
grant execute on function public.team_assessment_progress(uuid) to authenticated;

drop policy results_read_by_campaign_visibility on public.assessment_results;
create policy assessment_results_read_scoped on public.assessment_results
  for select to authenticated using ((select public.can_view_assessment(assessment_id)));

drop policy questionnaire_results_read_admin on public.questionnaire_results;
create policy questionnaire_results_read_scoped on public.questionnaire_results
  for select to authenticated using ((select public.can_view_assessment(assessment_id)));

drop policy answers_read_owner_or_admin on public.answers;
create policy answers_read_scoped on public.answers
  for select to authenticated using ((select public.can_view_assessment(assessment_id)));

drop policy text_answers_read_owner_or_admin on public.text_answers;
create policy text_answers_read_scoped on public.text_answers
  for select to authenticated using ((select public.can_view_assessment(assessment_id)));

drop policy answer_options_read_owner_or_admin on public.answer_option_selections;
create policy answer_options_read_scoped on public.answer_option_selections
  for select to authenticated using (exists (
    select 1 from public.answers a
    where a.id = answer_option_selections.answer_id
      and (select public.can_view_assessment(a.assessment_id))
  ));

create policy questions_read_assessment_scope on public.questions
  for select to authenticated using ((select public.can_view_question(id)));

create policy options_read_assessment_scope on public.question_options
  for select to authenticated using ((select public.can_view_question(question_id)));
