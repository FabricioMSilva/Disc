alter table public.employee_directory
  add column if not exists horario_trabalho text,
  add column if not exists local_trabalho text;
