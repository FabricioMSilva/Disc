# People Insights

Plataforma interna de avaliação DISC e competências, com gestão de campanhas, equipes e questionários versionados.

## Requisitos

- Node.js 20 LTS (Node 18.18+ também atende ao Next.js 15)
- Projeto Supabase com Auth e PostgreSQL
- Acesso ao SQL Editor do Supabase

## Configuração

1. Crie um projeto Supabase e habilite autenticação por e-mail/senha.
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os valores do projeto. `NEXT_PUBLIC_SUPABASE_ANON_KEY` ainda é aceito para compatibilidade, mas prefira a chave publicável.
3. Em um projeto Supabase novo, execute `supabase/setup.sql` uma única vez no SQL Editor. O script reúne as quatro migrações, políticas/RPCs e o seed inicial do questionário e da campanha.
4. Não execute `setup.sql` em um banco onde essas migrações já foram aplicadas. Os arquivos individuais em `supabase/migrations/` e `supabase/seed.sql` continuam disponíveis para histórico e evolução do schema.
5. Configure Auth > URL Configuration. Para desenvolvimento, use `http://localhost:3000` como Site URL e permita o callback local.
6. Configure SMTP em Supabase Auth para entregar confirmações de e-mail fora do ambiente de desenvolvimento.
7. Instale e execute a aplicação:

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

O login usa e-mail e senha. O cadastro existente grava o nome no perfil Supabase e exige convite válido e confirmação de e-mail para ativação. O diretório local `data/private/funcionarios.json` não é necessário para esse fluxo.

## Cadastro de funcionários

O login usa e-mail e senha do Supabase Auth. No cadastro por convite, o nome informado é salvo no perfil Supabase quando a conta é criada; a senha é gerenciada pelo Auth. A lista legada em `data/private/funcionarios.json` não é necessária nesse fluxo e continua ignorada pelo Git.

## Primeiro administrador

Cadastre o usuário que será administrador e confirme o e-mail. No SQL Editor do Supabase, promova somente esse usuário usando o UUID consultado em Authentication > Users:

```sql
update public.profiles
set role = 'super_admin', status = 'active', ativo = true
where id = 'UUID-DO-USUARIO';
```

Cadastros sem convite válido permanecem inativos até aprovação. Convites são associados à conta somente depois da confirmação do endereço de e-mail; contas já confirmadas aceitam o convite na próxima sessão. O convite fica registrado na plataforma, mas o envio da mensagem de convite não está integrado; compartilhe manualmente a rota `/cadastro`. SMTP cobre os e-mails de confirmação enviados pelo Supabase Auth.

## Perfis e acesso

- `super_admin` e `admin`: administração de usuários, equipes, campanhas, questionários, resultados e auditoria.
- `manager`: acesso às equipes atribuídas e aos fluxos de campanha permitidos.
- `questionnaire_editor`: criação, edição e publicação de questionários.
- `participant`: preenchimento e consulta dos próprios dados autorizados.
- `auditor`: consulta dos registros de auditoria.

Autorização é aplicada no PostgreSQL por RLS e RPCs. Não coloque `service_role` no navegador nem em variáveis `NEXT_PUBLIC_*`.

## Questionários e campanhas

Questionários são editados em rascunho e publicados como versões imutáveis. Alterações posteriores devem ser feitas em uma nova versão. Campanhas exigem uma versão publicada e equipes dentro do escopo de quem as cria. O fluxo do participante suporta escala, Likert, escolha única/múltipla, texto, número, data e booleano.

O seed inclui as 40 questões da aba `Planilha1` e cinco perguntas reflexivas, além de uma campanha inicial. O cálculo mantém os totais por dimensão e aplica o índice ponderado definido na planilha: DISC 20%, Segurança 30%, Disciplina 20%, Trabalho em Equipe 20% e Comunicação 10%. As faixas DISC e de competências, assim como as recomendações por perfil, também seguem a aba `Planilha2`. A linha de respostas pessoais de exemplo da planilha não é importada. Reveja o conteúdo com RH e Segurança do Trabalho antes de uso operacional; as questões de exemplo não substituem instrumento validado ou orientação clínica.

## Comandos

```powershell
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Limites atuais

Login por e-mail/senha está implementado. OIDC/SSO é uma integração futura e precisa ser habilitada/configurada no provedor de identidade e no Supabase antes de ser anunciada como disponível. Envio de e-mail requer SMTP. Os testes de build e SQL devem ser executados em ambiente com Node.js e Supabase/PostgreSQL.
