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
(1, 'D', 'Tomo iniciativa quando surge um problema operacional.'),
(2, 'D', 'Consigo decidir rapidamente em situações críticas.'),
(3, 'D', 'Gosto de assumir responsabilidades por resultados.'),
(4, 'D', 'Sinto-me confortável liderando atividades da equipe.'),
(5, 'D', 'Busco soluções mesmo quando não existem procedimentos claros.'),
(6, 'I', 'Compartilho informações de forma espontânea com a equipe.'),
(7, 'I', 'Tenho facilidade para me comunicar com diferentes pessoas.'),
(8, 'I', 'Costumo motivar colegas durante atividades difíceis.'),
(9, 'I', 'Gosto de participar de reuniões e discussões de melhorias.'),
(10, 'I', 'Sou procurado pelos colegas para orientação ou apoio.'),
(11, 'S', 'Mantenho a calma diante de situações de pressão.'),
(12, 'S', 'Trabalho bem em equipe.'),
(13, 'S', 'Respeito processos e rotinas estabelecidas.'),
(14, 'S', 'Procuro evitar conflitos desnecessários.'),
(15, 'S', 'Sou visto como uma pessoa confiável pela equipe.'),
(16, 'C', 'Sigo procedimentos operacionais rigorosamente.'),
(17, 'C', 'Tenho atenção aos detalhes das atividades.'),
(18, 'C', 'Analiso riscos antes de executar uma tarefa.'),
(19, 'C', 'Registro informações corretamente.'),
(20, 'C', 'Preocupo-me com qualidade e conformidade dos serviços.'),
(21, 'SEG', 'Utilizo corretamente todos os EPIs necessários.'),
(22, 'SEG', 'Interrompo atividades quando identifico riscos.'),
(23, 'SEG', 'Conheço os procedimentos de segurança da minha área.'),
(24, 'SEG', 'Reporto desvios de segurança imediatamente.'),
(25, 'SEG', 'Sou exemplo de comportamento seguro para a equipe.'),
(26, 'DIS', 'Cumpro procedimentos sem realizar atalhos.'),
(27, 'DIS', 'Mantenho registros atualizados.'),
(28, 'DIS', 'Cumpro horários e rotinas estabelecidas.'),
(29, 'DIS', 'Realizo inspeções conforme determinado.'),
(30, 'DIS', 'Sigo padrões definidos para execução das atividades.'),
(31, 'TE', 'Coopero com colegas quando necessário.'),
(32, 'TE', 'Compartilho conhecimento e experiências.'),
(33, 'TE', 'Contribuo para resolução de problemas coletivos.'),
(34, 'TE', 'Respeito opiniões diferentes.'),
(35, 'TE', 'Ajudo novos colaboradores na adaptação à área.'),
(36, 'COM', 'Comunico desvios e anomalias rapidamente.'),
(37, 'COM', 'Dou retorno quando recebo uma solicitação.'),
(38, 'COM', 'Escuto atentamente antes de responder.'),
(39, 'COM', 'Expresso ideias de maneira clara.'),
(40, 'COM', 'Registro informações importantes adequadamente.')
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
  ('Nunca', 1, 1), ('Raramente', 2, 2), ('Às vezes', 3, 3),
  ('Frequentemente', 4, 4), ('Sempre', 5, 5)
) as option(label, score, display_order)
where q.tipo = 'escala'
on conflict (question_id, display_order) do nothing;

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