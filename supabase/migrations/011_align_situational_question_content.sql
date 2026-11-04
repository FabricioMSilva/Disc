begin;

create temporary table situational_question_texts (
  numero integer primary key,
  codigo text not null,
  texto text not null
) on commit drop;

insert into pg_temp.situational_question_texts (numero, codigo, texto) values
  (1, 'D', 'Durante a troca de turno, surge um problema inesperado e ainda não está claro quem vai coordenar as primeiras ações.'),
  (2, 'D', 'Uma atividade importante está atrasada e o prazo começa a ficar comprometido.'),
  (3, 'D', 'Em uma conversa da equipe, há opiniões diferentes e ninguém propõe uma decisão.'),
  (4, 'D', 'Um problema recorrente volta a acontecer durante a rotina, e a equipe ainda não definiu como agir.'),
  (5, 'D', 'Você percebe uma oportunidade de melhoria, mas a equipe está acostumada ao método atual.'),
  (6, 'I', 'Um novo colega começa na equipe e demonstra insegurança sobre a rotina.'),
  (7, 'I', 'Durante uma conversa sobre melhorias, algumas pessoas participam pouco.'),
  (8, 'I', 'A equipe enfrenta uma tarefa difícil e o ânimo começa a cair.'),
  (9, 'I', 'Um colega compartilha uma forma mais prática de realizar uma atividade, que também pode ser útil para outras pessoas.'),
  (10, 'I', 'Um colega pede sua opinião sobre uma decisão que afeta a equipe.'),
  (11, 'S', 'Uma mudança de última hora altera a programação que a equipe havia combinado.'),
  (12, 'S', 'O ambiente fica pressionado porque várias demandas precisam ser resolvidas ao mesmo tempo.'),
  (13, 'S', 'Durante uma tarefa longa e repetitiva, o ritmo da equipe oscila.'),
  (14, 'S', 'Surge um desentendimento entre colegas sobre a divisão de uma tarefa.'),
  (15, 'S', 'A rotina muda pouco, mas exige atenção contínua ao longo do turno.'),
  (16, 'C', 'Você recebe uma orientação para uma atividade e percebe que um detalhe importante não ficou claro.'),
  (17, 'C', 'Uma atividade parece pronta para ser encerrada, mas ainda há um item de conferência pendente.'),
  (18, 'C', 'Durante uma atividade de rotina, você percebe uma forma mais rápida de concluir o trabalho, mas isso exige ignorar etapas que normalmente são realizadas.'),
  (19, 'C', 'Durante a passagem de turno, você nota que um registro está incompleto e que a próxima equipe pode depender dele.'),
  (20, 'C', 'A equipe precisa tomar uma decisão com informações ainda incompletas.'),
  (21, 'SEG', 'Você percebe uma condição que ainda não causou acidente, mas pode representar risco futuramente.'),
  (22, 'SEG', 'Um colega está prestes a iniciar uma atividade sem observar um possível risco ao redor.'),
  (23, 'SEG', 'Ao mudar de tarefa ou de área, você encontra uma situação diferente da esperada.'),
  (24, 'SEG', 'Uma atividade está perto do prazo, mas ainda falta uma verificação de segurança.'),
  (25, 'SEG', 'Depois de uma ocorrência sem consequências, a rotina tende a continuar normalmente.'),
  (26, 'DIS', 'Uma atividade simples e repetitiva precisa ser registrada ao final do turno.'),
  (27, 'DIS', 'A equipe combinou uma sequência de etapas, mas surge pressão para adiantar a próxima fase.'),
  (28, 'DIS', 'No fim do turno, você percebe que uma verificação de rotina ainda não foi registrada.'),
  (29, 'DIS', 'Uma inspeção recorrente não identificou problemas nas últimas vezes.'),
  (30, 'DIS', 'Durante o dia, interrupções e mudanças de prioridade deixam algumas rotinas pendentes.'),
  (31, 'TE', 'Você concluiu sua atividade e percebe que um colega ainda tem dificuldade para concluir a dele.'),
  (32, 'TE', 'Um colega encontra uma solução útil para uma dificuldade comum da equipe.'),
  (33, 'TE', 'A equipe precisa resolver um problema que afeta várias pessoas.'),
  (34, 'TE', 'Em uma discussão, um colega apresenta uma opinião diferente da maioria.'),
  (35, 'TE', 'Um novo integrante ainda está aprendendo a rotina da equipe e faz perguntas básicas.'),
  (36, 'COM', 'Na passagem de turno, há uma informação importante que pode alterar a prioridade da próxima equipe.'),
  (37, 'COM', 'Você percebe um desvio em uma atividade compartilhada por diferentes pessoas.'),
  (38, 'COM', 'Um colega explica uma preocupação que você não entendeu completamente.'),
  (39, 'COM', 'Você recebe um retorno de que uma orientação sua gerou dúvida.'),
  (40, 'COM', 'Ao registrar uma ocorrência ou mudança relevante, há pouco tempo para escrever.');

do $$
declare
  questionnaire_uuid uuid;
  source_version_uuid uuid;
  target_version_uuid uuid;
  next_version_number integer;
  section_row record;
  question_row record;
  new_section_uuid uuid;
  new_question_uuid uuid;
  replacement_text text;
begin
  select id into questionnaire_uuid
  from public.questionnaires
  where slug = 'disc-competencias-operacionais';

  if questionnaire_uuid is null then
    raise exception 'Questionário DISC e Competências Operacionais não encontrado.';
  end if;

  select version.id into target_version_uuid
  from public.questionnaire_versions version
  where version.questionnaire_id = questionnaire_uuid
    and version.status = 'published'
    and not exists (
      select 1
      from pg_temp.situational_question_texts expected
      where not exists (
        select 1
        from public.questionnaire_sections section
        join public.questions question on question.section_id = section.id
        join public.themes theme on theme.id = question.theme_id
        where section.version_id = version.id
          and question.numero = expected.numero
          and question.tipo = 'escala'
          and theme.codigo = expected.codigo
          and question.texto = expected.texto
      )
    )
  order by version.version_number desc
  limit 1;

  if target_version_uuid is null then
    select version.id into source_version_uuid
    from public.questionnaire_versions version
    where version.questionnaire_id = questionnaire_uuid
      and version.status = 'published'
    order by version.version_number desc
    limit 1;

    if source_version_uuid is null then
      raise exception 'Não há uma versão publicada para copiar.';
    end if;

    select coalesce(max(version_number), 0) + 1
    into next_version_number
    from public.questionnaire_versions
    where questionnaire_id = questionnaire_uuid;

    insert into public.questionnaire_versions (questionnaire_id, version_number, status)
    values (questionnaire_uuid, next_version_number, 'draft')
    returning id into target_version_uuid;

    for section_row in
      select *
      from public.questionnaire_sections
      where version_id = source_version_uuid
      order by display_order
    loop
      insert into public.questionnaire_sections (
        version_id, code, title, description, section_type, display_order, settings
      )
      values (
        target_version_uuid, section_row.code, section_row.title, section_row.description,
        section_row.section_type, section_row.display_order, section_row.settings
      )
      returning id into new_section_uuid;

      for question_row in
        select *
        from public.questions
        where section_id = section_row.id
        order by ordem
      loop
        replacement_text := null;
        select expected.texto into replacement_text
        from pg_temp.situational_question_texts expected
        join public.themes theme on theme.codigo = expected.codigo
        where expected.numero = question_row.numero
          and theme.id = question_row.theme_id;

        insert into public.questions (
          theme_id, section_id, numero, texto, tipo, ordem, obrigatoria, ativa,
          weight, dimension_code, settings
        )
        values (
          question_row.theme_id, new_section_uuid, question_row.numero,
          coalesce(replacement_text, question_row.texto), question_row.tipo, question_row.ordem,
          question_row.obrigatoria, question_row.ativa, question_row.weight,
          question_row.dimension_code, question_row.settings
        )
        returning id into new_question_uuid;

        insert into public.question_options (question_id, label, score, display_order)
        select new_question_uuid, option.label, option.score, option.display_order
        from public.question_options option
        where option.question_id = question_row.id;

        if question_row.tipo = 'escala' then
          update public.question_options
          set label = case display_order
            when 1 then 'Nunca me identifico'
            when 2 then 'Raramente me identifico'
            when 3 then 'Às vezes me identifico'
            when 4 then 'Frequentemente me identifico'
            when 5 then 'Sempre me identifico'
          end
          where question_id = new_question_uuid and display_order between 1 and 5;
        end if;
      end loop;
    end loop;

    if exists (
      select 1
      from pg_temp.situational_question_texts expected
      where not exists (
        select 1
        from public.questionnaire_sections section
        join public.questions question on question.section_id = section.id
        join public.themes theme on theme.id = question.theme_id
        where section.version_id = target_version_uuid
          and question.numero = expected.numero
          and question.tipo = 'escala'
          and theme.codigo = expected.codigo
          and question.texto = expected.texto
      )
    ) then
      raise exception 'A nova versão não contém todas as 40 situações esperadas.';
    end if;
  end if;

  update public.questionnaire_versions
  set status = 'retired'
  where questionnaire_id = questionnaire_uuid
    and id <> target_version_uuid
    and status = 'published';

  update public.questionnaire_versions
  set status = 'published',
      published_at = coalesce(published_at, now())
  where id = target_version_uuid;

  update public.questionnaires
  set status = 'published', updated_at = now()
  where id = questionnaire_uuid;

  update public.campaigns campaign
  set questionnaire_version_id = target_version_uuid, updated_at = now()
  where campaign.status in ('draft', 'scheduled', 'active')
    and campaign.questionnaire_version_id in (
      select version.id
      from public.questionnaire_versions version
      where version.questionnaire_id = questionnaire_uuid
    )
    and campaign.questionnaire_version_id is distinct from target_version_uuid;
end;
$$;

commit;
