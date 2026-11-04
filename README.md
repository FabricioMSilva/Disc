# People Insights

Plataforma interna de avaliação DISC e competências, com gestão de campanhas, equipes e questionários versionados.

## Requisitos

- Node.js 20 LTS (Node 18.18+ também atende ao Next.js 15)
- Projeto Supabase com Auth e PostgreSQL
- Acesso ao SQL Editor do Supabase

## Configuração

1. Crie um projeto Supabase e habilite autenticação por e-mail/senha.
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os valores do projeto. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ainda é aceito para compatibilidade, mas prefira a chave publicável.
3. Em um projeto Supabase novo, execute `supabase/setup.sql` uma única vez no SQL Editor. O script reúne as oito migrações, o diretório de funcionários e o seed inicial do questionário e da campanha.
4. Se o schema 001–004 já estiver instalado, execute as migrações `005_employee_directory.sql`, `006_employee_directory_work_fields.sql`, `007_fix_assessment_completion_order.sql` e `008_results_dashboard_access.sql`, nessa ordem. Se 005–007 já foram aplicadas, execute somente a 008. Não execute `setup.sql` em um banco existente.
5. No Supabase Table Editor, importe a lista de funcionários para `employee_directory` em CSV com os cabeçalhos `nome,email,matricula,horario_trabalho,local_trabalho,perfil,ativo`. Cada e-mail e matrícula preenchidos devem ser únicos; funcionários que usarão o site precisam de e-mail. A lista não deve ser colocada no repositório.
6. Configure Auth > URL Configuration com confirmação de e-mail habilitada. Para desenvolvimento, use `http://localhost:3000` como Site URL e permita `http://localhost:3000/auth/callback`; também permita o callback do domínio Netlify em produção.
7. Configure SMTP em Supabase Auth para entregar confirmações e links de criação de senha fora do ambiente de desenvolvimento.
8. Instale e execute a aplicação:

```powershell
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Deploy na Netlify

1. Conecte o repositório GitHub à Netlify. O arquivo `netlify.toml` configura `npm run build` e Node.js 20; o adaptador Next.js da Netlify cuida das rotas dinâmicas, Server Actions e middleware.
2. Em **Site configuration > Environment variables**, defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para os contextos de build e functions.
3. Em **Supabase > Authentication > URL Configuration**, configure a URL pública da Netlify como Site URL e permita os URLs de callback usados pelos deploys e previews.
4. Nunca configure uma chave `service_role` ou `sb_secret_*` com prefixo `NEXT_PUBLIC_`, nem adicione essas chaves ao repositório. A senha de cada usuário é gerenciada pelo Supabase Auth.

No login, a pessoa pesquisa pelo nome, e-mail ou matrícula e seleciona seu cadastro. Contas existentes entram com a senha do Supabase Auth. No primeiro acesso, a senha é criada e o link de confirmação é enviado ao e-mail registrado; após a confirmação, o callback autentica a pessoa automaticamente. Para contas existentes sem senha, o acesso envia um link para defini-la.

## Cadastro de funcionários

O diretório é administrado no Supabase, não no arquivo local. Use o Table Editor ou uma importação CSV para adicionar e atualizar funcionários. O SQL associa contas Auth ao registro pelo e-mail e mantém o nome, a matrícula e a função sincronizados no perfil. O diretório local `data/private/funcionarios.json` não é usado em produção.

## Primeiro administrador

Adicione o funcionário administrador ao diretório e crie a conta pelo fluxo normal de primeiro acesso. Depois de confirmar o e-mail, promova somente esse usuário usando o UUID consultado em Authentication > Users:

```sql
update public.profiles
set role = 'super_admin', status = 'active', ativo = true
where id = 'UUID-DO-USUARIO';
```

Somente funcionários cadastrados no diretório podem criar contas pelo fluxo de acesso. Convites existentes ainda podem atribuir equipe e outros perfis depois da confirmação do endereço de e-mail.

No ambiente de teste, depois que os dois perfis existirem, `supabase/operations/assign_test_managers.sql` atribui a role `manager` a Fabricio Silva e Jossimar Silva. O script falha se encontrar perfis ausentes/duplicados ou se a mudança remover o último administrador ativo. Atribua cada gestor somente às equipes que ele deve acompanhar em **Admin > Equipes**; a role, sozinha, não concede escopo de equipe.

## Perfis e acesso

As páginas iniciais de administrador e gestor incluem um cartão de avaliação
pessoal. O cartão consulta somente a avaliação mais recente da própria conta e
oferece iniciar, retomar ou consultar o resultado, sem usar os dados demonstrativos
da prévia administrativa.

A página Pessoas não exige convites: administradores e gestores acompanham
integrantes e horários, enquanto a liberação e o vínculo à equipe ocorrem
automaticamente no acesso. Os registros de convites existentes são preservados
no banco, mas os formulários e listas de convites não aparecem nessa página.

Execute `014_people_onboarding_summary.sql` para os indicadores de Admin >
Pessoas: total de funcionários, senha cadastrada, avaliações em andamento e
concluídas. O total reúne funcionários ativos do diretório (mesmo sem conta) e
membros ativos de equipes que não constam no diretório, sem duplicar contas.
O status considera a avaliação mais recente não cancelada. O RPC exige acesso
administrativo e retorna somente contagens; nenhum hash de senha é exposto.

Em Pessoas, o gráfico de perfis DISC conta somente o resultado da avaliação
mais recente concluída de cada integrante cujo status atual é concluído.
Resultados antigos e vínculos duplicados de equipe não somam novamente a pessoa.

Após aplicar `012_link_directory_to_jossimar_team.sql`, execute
`013_automatic_assessment_access.sql`. A 013 libera todos os perfis existentes e,
em cada acesso autenticado, ativa a conta e inclui a pessoa na Equipe Jossimar.
Isso não depende de `employee_directory.auth_user_id` já estar preenchido.
Contas existentes em Supabase Auth sem registro em `profiles` recebem um perfil
de participante automaticamente; perfis já existentes não têm seu papel alterado.
O vínculo do diretório é reparado pelo e-mail quando possível. Os papéis existentes
são preservados; não há promoção automática para gestor ou administrador.
Inscrições em campanhas ativas que exigem atribuição também são preparadas no
acesso, sem reiniciar avaliações, apagar respostas ou remover a espera de três
meses. Nesta configuração, desativar apenas o perfil não bloqueia permanentemente
a conta: o próximo acesso autenticado o ativa novamente. Para revogar o acesso,
use os controles da conta no Supabase Auth.

- `super_admin` e `admin`: administração de usuários, equipes, campanhas, questionários, resultados e auditoria.
- `manager`: acesso às equipes atribuídas e aos fluxos de campanha permitidos.
- `questionnaire_editor`: criação, edição e publicação de questionários.
- `participant`: preenchimento e consulta dos próprios dados autorizados.
- `auditor`: consulta dos registros de auditoria.

Autorização é aplicada no PostgreSQL por RLS e RPCs. Não coloque `service_role` no navegador nem em variáveis `NEXT_PUBLIC_*`.
Participantes consultam somente os próprios dashboards e respostas; gestores consultam resultados de integrantes das equipes ativas vinculadas ao seu perfil; administradores têm acesso administrativo aos resultados.

## Questionários e campanhas

Questionários são editados em rascunho e publicados como versões imutáveis. Alterações posteriores devem ser feitas em uma nova versão. Campanhas exigem uma versão publicada e equipes dentro do escopo de quem as cria. O fluxo do participante suporta escala, Likert, escolha única/múltipla, texto, número, data e booleano.

O seed inclui as 40 questões da aba `Planilha1` e cinco perguntas reflexivas, além de uma campanha inicial. O cálculo mantém os totais por dimensão e aplica o índice ponderado definido na planilha: DISC 20%, Segurança 30%, Disciplina 20%, Trabalho em Equipe 20% e Comunicação 10%. As faixas DISC e de competências, assim como as recomendações por perfil, também seguem a aba `Planilha2`. A linha de respostas pessoais de exemplo da planilha não é importada. Reveja o conteúdo com RH e Segurança do Trabalho antes de uso operacional; as questões de exemplo não substituem instrumento validado ou orientação clínica.

As perguntas Q1–Q40 e suas cinco alternativas comportamentais fixas ficam em
`lib/assessment-question-content.ts`. A avaliação, revisão e listagem de respostas do
relatório usam esse conteúdo, sem migração SQL. Cada alternativa continua salvando
somente seu valor de 1 a 5 no modelo existente. A numeração interna determina o
conteúdo, independentemente da ordem embaralhada; as categorias não são mostradas
no questionário. Todas as 40 perguntas usam alternativas específicas da situação.
Alterar esses textos não converte respostas já salvas: os valores numéricos
existentes permanecem os mesmos.

Após concluir, a pessoa é direcionada ao seu dashboard individual. Gestores e administradores podem abrir dashboards concluídos no escopo autorizado, consultar as respostas e usar a impressão do navegador para salvar em PDF ou baixar um CSV compatível com Excel.

Em Admin > Resultados, os cartões apresentam a média dos totais por dimensão
em pontos, com máximo de 25, e a média das respostas na escala de 1 a 5
(média dos totais dividida por 5). As barras usam o limite de 25 pontos.
São consideradas as avaliações concluídas entre os até 100 registros exibidos
pelos filtros, não uma média de todo o histórico.

## Comandos

```powershell
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Limites atuais

Login por e-mail/senha está implementado. OIDC/SSO é uma integração futura e precisa ser habilitada/configurada no provedor de identidade e no Supabase antes de ser anunciada como disponível. Envio de e-mail requer SMTP. Os testes de build e SQL devem ser executados em ambiente com Node.js e Supabase/PostgreSQL.
