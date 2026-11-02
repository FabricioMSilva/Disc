do $migration$
declare
  function_definition text;
  broken_order_clause constant text := 'order by total desc, case codigo';
  fixed_order_clause constant text := 'order by d.total desc, case d.codigo';
begin
  select pg_get_functiondef(to_regprocedure('public.complete_assessment(uuid)'))
  into function_definition;

  if function_definition is null then
    raise exception 'public.complete_assessment(uuid) was not found.';
  end if;

  if position(broken_order_clause in function_definition) > 0 then
    execute replace(function_definition, broken_order_clause, fixed_order_clause);
  elsif position(fixed_order_clause in function_definition) = 0 then
    raise exception 'The expected profile ordering clause was not found in complete_assessment.';
  end if;
end;
$migration$;
