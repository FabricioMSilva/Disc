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