begin;

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
(40, 'COM', 'Ao registrar uma ocorrência ou mudança relevante, há pouco tempo para escrever.')
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

commit;

begin;

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
  ('Nunca me identifico', 1, 1), ('Raramente me identifico', 2, 2), ('Às vezes me identifico', 3, 3),
  ('Frequentemente me identifico', 4, 4), ('Sempre me identifico', 5, 5)
) as option(label, score, display_order)
where q.tipo = 'escala'
on conflict (question_id, display_order) do nothing;

update public.question_options option
set label = case option.display_order
  when 1 then 'Nunca me identifico'
  when 2 then 'Raramente me identifico'
  when 3 then 'Às vezes me identifico'
  when 4 then 'Frequentemente me identifico'
  when 5 then 'Sempre me identifico'
end
from public.questions q
where q.id = option.question_id and q.tipo = 'escala' and option.display_order between 1 and 5;

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

commit;