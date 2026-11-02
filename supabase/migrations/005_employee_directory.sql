create table public.employee_directory (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  matricula text,
  perfil text,
  ativo boolean not null default true,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint employee_directory_email_not_blank check (email is null or length(trim(email)) > 0),
  constraint employee_directory_matricula_not_blank check (matricula is null or length(trim(matricula)) > 0)
);

create unique index employee_directory_email_unique
  on public.employee_directory (lower(trim(email)))
  where email is not null;
create unique index employee_directory_matricula_unique
  on public.employee_directory (lower(trim(matricula)))
  where matricula is not null;

alter table public.employee_directory enable row level security;
create policy employee_directory_admin_manage on public.employee_directory for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.employee_directory from anon, authenticated;
grant select, insert, update, delete on public.employee_directory to authenticated;

create or replace function public.search_employee_directory(p_query text)
returns table(
  employee_id uuid,
  name text,
  email text,
  employee_number text,
  profile text,
  has_account boolean,
  has_password boolean,
  email_confirmed boolean
)
language sql stable security definer set search_path = '' as $$
  with input as (select lower(trim(coalesce(p_query, ''))) as term)
  select e.id, e.nome, e.email, e.matricula, e.perfil,
    exists (select 1 from auth.users u where lower(u.email) = lower(e.email)) as has_account,
    exists (select 1 from auth.users u
      where lower(u.email) = lower(e.email) and nullif(u.encrypted_password, '') is not null) as has_password,
    exists (select 1 from auth.users u
      where lower(u.email) = lower(e.email) and u.email_confirmed_at is not null) as email_confirmed
  from public.employee_directory e cross join input
  where e.ativo and length(input.term) between 3 and 120 and (
    position(input.term in lower(e.nome)) > 0 or
    position(input.term in lower(coalesce(e.email, ''))) > 0 or
    position(input.term in lower(coalesce(e.matricula, ''))) > 0
  )
  order by case
      when lower(coalesce(e.email, '')) = input.term then 0
      when lower(coalesce(e.matricula, '')) = input.term then 1
      else 2
    end, e.nome
  limit 8;
$$;
revoke all on function public.search_employee_directory(text) from public;
grant execute on function public.search_employee_directory(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  employee_id uuid;
  employee_name text;
  employee_number text;
  employee_profile text;
begin
  select e.id, e.nome, e.matricula, e.perfil
  into employee_id, employee_name, employee_number, employee_profile
  from public.employee_directory e
  where e.ativo and lower(trim(e.email)) = lower(trim(new.email))
  for update;

  insert into public.profiles(id, nome, email, matricula, funcao, role, status, ativo, created_by)
  values (
    new.id,
    coalesce(employee_name, new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    employee_number,
    employee_profile,
    'participant',
    'invited',
    false,
    null
  )
  on conflict (id) do update set email = excluded.email;

  if employee_id is not null then
    update public.employee_directory set auth_user_id = new.id
    where id = employee_id and (auth_user_id is null or auth_user_id = new.id);
  end if;

  if new.email_confirmed_at is not null then
    perform public.accept_invitation_for_user(new.id, new.email);
    update public.profiles p set status = 'active', ativo = true
    where p.id = new.id and p.status = 'invited'
      and exists (select 1 from public.employee_directory e where e.auth_user_id = new.id and e.ativo);
  end if;
  return new;
end;
$$;

create or replace function public.accept_confirmed_user_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.accept_invitation_for_user(new.id, new.email);
    update public.profiles p set status = 'active', ativo = true
    where p.id = new.id and p.status = 'invited'
      and exists (select 1 from public.employee_directory e where e.auth_user_id = new.id and e.ativo);
  end if;
  return new;
end;
$$;

update public.employee_directory e
set auth_user_id = u.id
from auth.users u
where e.auth_user_id is null
  and e.ativo
  and lower(trim(e.email)) = lower(trim(u.email))
  and not exists (
    select 1 from public.employee_directory linked
    where linked.auth_user_id = u.id
  );

update public.profiles p
set nome = e.nome,
    matricula = e.matricula,
    funcao = e.perfil,
    status = case when u.email_confirmed_at is not null then 'active' else p.status end,
    ativo = case when u.email_confirmed_at is not null then true else p.ativo end
from public.employee_directory e
join auth.users u on u.id = e.auth_user_id
where p.id = u.id;
