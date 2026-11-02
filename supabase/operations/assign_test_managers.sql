do $configure_test_managers$
declare
  fabricio_profiles integer;
  jossimar_profiles integer;
  active_admins integer;
  target_active_admins integer;
begin
  select
    count(*) filter (where lower(btrim(coalesce(nome, ''))) = 'fabricio silva'),
    count(*) filter (where lower(btrim(coalesce(nome, ''))) = 'jossimar silva')
  into fabricio_profiles, jossimar_profiles
  from public.profiles;

  if fabricio_profiles <> 1 or jossimar_profiles <> 1 then
    raise exception
      'Esperado exatamente um perfil para cada pessoa. Encontrados: Fabricio Silva=%, Jossimar Silva=%. Nenhuma função foi alterada.',
      fabricio_profiles, jossimar_profiles;
  end if;

  select
    count(*) filter (where role in ('admin', 'super_admin') and status = 'active'),
    count(*) filter (
      where lower(btrim(coalesce(nome, ''))) in ('fabricio silva', 'jossimar silva')
        and role in ('admin', 'super_admin') and status = 'active'
    )
  into active_admins, target_active_admins
  from public.profiles;

  if target_active_admins > 0 and active_admins - target_active_admins < 1 then
    raise exception 'A alteração removeria o último administrador ativo. Mantenha ou configure outro administrador antes de continuar.';
  end if;

  update public.profiles
  set role = 'manager'
  where lower(btrim(coalesce(nome, ''))) in ('fabricio silva', 'jossimar silva');
end;
$configure_test_managers$;
