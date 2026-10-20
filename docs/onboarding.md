# Preparação local

## Pré-requisitos

- Node.js 24+ (`node -v`) e npm 11+ (`npm -v`).
- Git.
- Opcional: PostgreSQL local ou conexão autorizada (só quando houver schema).
- Opcional: app no Meta for Developers para dados reais do Instagram.

## Primeira execução

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem `.env.local`, tudo funciona com dados de exemplo.

O npm 11 avisa que alguns pacotes (`esbuild`, `unrs-resolver`) têm scripts de instalação não aprovados. Lint, testes, build e `db:generate` funcionaram sem aprová-los; só aprove (`npm install-scripts approve <pacote>`) se algum comando falhar por isso.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` (ignorado pelo Git) e preencha só o que for usar:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL (`postgres://` ou `postgresql://`) |
| `DATABASE_URL_UNPOOLED` | Conexão direta para migrations, se o provedor exigir |
| `LOG_LEVEL` | Nível do Pino (padrão `info`) |
| `INSTAGRAM_ACCESS_TOKEN` | Token da Graph API |
| `INSTAGRAM_BUSINESS_ID` | ID numérico da sua conta comercial do Instagram (quem consulta) |
| `INSTAGRAM_TARGET_USERNAME` | Perfil padrão analisado (padrão `biodev`); `?target=` na URL sobrepõe |
| `META_VERIFICATION_CODE` | Código da meta tag `facebook-domain-verification`; vazio = sem tag |
| `INSTAGRAM_COMPETITORS` | Concorrentes do Market Radar, separados por vírgula (até 10) |
| `CRON_SECRET` | Segredo da coleta diária `/api/cron/snapshot` (16+ caracteres aleatórios) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Cliente OAuth do Google para "Entrar com Google" |
| `BETTER_AUTH_SECRET` | Assina as sessões; 32+ caracteres aleatórios |
| `BETTER_AUTH_URL` | Endereço do site (`http://localhost:3000` em dev, domínio real em produção) |
| `ADMIN_EMAILS` | E-mails do Google com acesso a `/admin` e Configurações, separados por vírgula |
| `SUPPORT_WHATSAPP` | WhatsApp do suporte mostrado aos clientes (DDD + número) |
| `UNOFFICIAL_SOURCE_ENABLED` | Chave geral da fonte não oficial. Só vale `true` exato; qualquer outro valor deixa a fonte desligada |
| `APIFY_TOKEN` | Token da conta Apify (somente no servidor). Sem ele a fonte fica desligada |

Em produção, as mesmas variáveis ficam na Vercel (Settings > Environment Variables).

### Dados reais do Instagram

1. **Token que não expira (recomendado): System User.** Em business.facebook.com → Configurações → Usuários → Usuários do sistema → Adicionar (função Admin) → Atribuir ativos (o app e a conta do Instagram/Página) → Gerar token, escolhendo o app e as permissões `instagram_business_basic`, `pages_show_list`, `business_management` e `instagram_manage_insights`, com validade “Nunca”.
   Alternativa para testes: Graph API Explorer (https://developers.facebook.com/tools/explorer/) com as mesmas permissões; esse token expira em ~1 h (ou 60 dias se trocado por long-lived).
2. Descubra o ID da sua conta comercial: `GET /me/accounts` → `id` da Página → `GET /{page-id}?fields=instagram_business_account`.
3. Preencha `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_BUSINESS_ID` no `.env.local` e reinicie `npm run dev`.

O token do Explorer expira em ~1 hora; use long-lived ou um System User (não expira) em produção. O alvo precisa ser conta comercial/criador **pública**. A integração usa a Graph API `v25.0`.

### Confirmar o app Meta

Para o `business_discovery` devolver dados reais, o app precisa passar por este processo no painel da Meta, nesta ordem:

1. **Criar o app** em developers.facebook.com com o produto **Instagram** (Instagram API with Facebook Login).
2. **Modo Live** (`Settings > Basic` → App Mode). Em Development a API real não responde.
3. **Business Verification** da empresa no Meta Business Manager.
4. **Domain Verification** (Business Suite → `Settings > Brand safety > Domains` → "Meta Tag"): cole o código em `META_VERIFICATION_CODE`; o app injeta a tag no `<head>`. A tag precisa estar no domínio onde o app roda na Vercel.
5. **App Review / Advanced Access** para `instagram_business_basic` e `instagram_manage_insights` (esta libera o `business_discovery`).
6. **Token long-lived ou System User** com as permissões acima; preencha `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_BUSINESS_ID` na Vercel.
7. **Testar:** `/api/instagram?target=@perfil` deve responder `source: "live"`. Erros comuns: `(#10) permission denied` (app fora de Live ou permissão sem Advanced Access) e `(#200) Access token has expired` (token curto vencido).

## Login com Google

Sem as quatro variáveis de login, o site mostra "Login ainda não configurado" e ninguém entra no painel.

1. Acesse https://console.cloud.google.com, crie (ou escolha) um projeto.
2. **APIs e serviços > Tela de permissão OAuth**: tipo **Externo**; preencha nome do app, e-mail de suporte, links `https://<seu-domínio>/privacidade` e `https://<seu-domínio>/termos`. Escopos: os padrões (`openid`, `email`, `profile`), que não exigem verificação do Google. Publique o app ("Em produção") para qualquer pessoa conseguir entrar.
3. **Credenciais > Criar credenciais > ID do cliente OAuth**, tipo **Aplicativo da Web**. Em **URIs de redirecionamento autorizados**, adicione:
   - `http://localhost:3000/api/auth/callback/google` (desenvolvimento)
   - `https://<seu-domínio>/api/auth/callback/google` (produção)
4. Copie o ID e a chave secreta para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
5. Gere `BETTER_AUTH_SECRET` (`npx @better-auth/cli secret` ou 32+ caracteres aleatórios) e defina `BETTER_AUTH_URL`.
6. Defina `ADMIN_EMAILS` com o seu e-mail do Google e `SUPPORT_WHATSAPP` com o número do suporte.
7. Na Vercel, cadastre as mesmas variáveis (com `BETTER_AUTH_URL` = domínio real), além de `DATABASE_URL` e `DATABASE_URL_UNPOOLED` do Neon, e faça um novo deploy.

Fluxo do cliente: entra com o Google → digita o @ → confirma a foto do perfil (escolha definitiva) → painel conforme o plano (todos começam no Básico). O admin muda planos e destrava perfis em `/admin`.

## Fonte não oficial (Apify): teste opcional

Serve para contas **pessoais públicas**, que a API oficial não lê. É um teste desligável: sem as duas variáveis abaixo, o app funciona como antes e não chama a Apify. O painel mostra o aviso "Fonte não oficial" sempre que esses dados aparecem.

1. Crie uma conta em https://apify.com no **plano Free**. Não cadastre cartão.
2. No painel da Apify, abra **Settings > Integrations** e copie o **API token** (é um segredo: não envie por chat nem coloque no código).
3. Na Vercel, em Settings > Environment Variables, cadastre `APIFY_TOKEN` com esse token e `UNOFFICIAL_SOURCE_ENABLED` com o valor `true`. Depois faça um novo deploy.
4. Aplique a migration que cria a coluna de liberação por conta (`drizzle/0002_aromatic_thunderball.sql`), somente quando você autorizar. Sem ela o `/admin` não consegue salvar a liberação.
5. Entre em `/admin` e clique em "Fonte não oficial: desligada" na conta que deve usar a fonte. O botão passa a dizer "ligada". Toda conta começa desligada.

**Atenção:** não troque para um plano pago da Apify sem pedir autorização antes. O Free tem US$ 5 de crédito por mês (cerca de 1.900 perfis, a US$ 2,60 por mil; página de preço apify.com/pricing e apify.com/apify/instagram-profile-scraper, consultadas em 2026-10-19). Se o crédito acabar ou a Apify recusar as consultas, os clientes devem ver "Dados indisponíveis" e o motivo fica no log do servidor. Esse comportamento ainda precisa ser confirmado em uma execução real.

Para desligar a fonte, apague `UNOFFICIAL_SOURCE_ENABLED` (ou troque para outro valor) na Vercel e faça um novo deploy. Para cortar só uma conta, desligue o botão dela em `/admin`.

## Banco

1. Tenha um PostgreSQL de desenvolvimento (local ou provedor) — nunca produção para testes.
2. Defina `DATABASE_URL` (e `DATABASE_URL_UNPOOLED`, se necessário) no `.env.local`.
3. Ao criar/alterar tabelas em `src/db/schema/`, rode `npm run db:generate` e revise o SQL em `drizzle/`.
4. Aplique com `npm run db:migrate` somente no banco correto.

A tabela `profile_snapshots` (migration `drizzle/0000_profile_snapshots.sql`) guarda um registro por perfil por dia. As tabelas de login `user`, `session`, `account` e `verification` (migration `drizzle/0001_auth.sql`) guardam contas, sessões, plano e @ travado.

Banco do projeto: Neon, projeto `nichemap` (região `aws-us-east-1`), criado em 2026-10-18 com as duas migrations aplicadas.

### Banco de produção (Vercel)

1. Na Vercel: **Storage > Create Database > Neon (Postgres)** e conecte ao projeto. Isso cria `DATABASE_URL` (e `DATABASE_URL_UNPOOLED`) nas variáveis do projeto.
2. Localmente, com autorização para mexer no banco de produção: `vercel env pull .env.production.local` e depois `npm run db:migrate` (o `drizzle.config.ts` carrega esse arquivo pelo `@next/env`). Apague o `.env.production.local` ao terminar; ele é ignorado pelo Git, mas contém segredos.
3. Crie `CRON_SECRET` nas variáveis da Vercel e faça um novo deploy. A coleta roda todo dia às 11:00 UTC; para disparar na hora: `curl -H "Authorization: Bearer $CRON_SECRET" https://<seu-domínio>/api/cron/snapshot`.

### Testar contra um Postgres descartável

Os testes `src/lib/snapshots.db.test.ts` e `src/lib/accounts.db.test.ts` só rodam com `TEST_DATABASE_URL` apontando para um banco **descartável** (eles aplicam as migrations e apagam as tabelas). Exemplo com o PostgreSQL local, sem senha, numa pasta temporária:

```bash
initdb -D /tmp/nichemap-pg -U postgres -A trust
pg_ctl -D /tmp/nichemap-pg -o "-p 5499" start
createdb -h 127.0.0.1 -p 5499 -U postgres nichemap_test
TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5499/nichemap_test npm test
```

## Verificar

```bash
npm run check
```

Roda lint, typecheck, self-check das regras, testes e build. Nada disso precisa de credenciais nem conecta ao banco. Esperado: tudo verde.

## Agentes

Leia [AGENTS.md](../AGENTS.md). [CLAUDE.md](../CLAUDE.md) importa as mesmas instruções. Ao abrir o projeto no Claude Code, aprove o servidor MCP `context7` (`.mcp.json`) e os plugins Ponytail e Caveman declarados em `.claude/settings.json`. No Codex, confie no projeto para carregar `.codex/config.toml`. Detalhes em [setup.md](setup.md).

## Dificuldades conhecidas

- **Painel em dados de exemplo com “Token do Instagram expirado ou inválido”**: o `INSTAGRAM_ACCESS_TOKEN` venceu (código 190 da Graph API). Gere um token de System User e atualize a variável. A página Configurações testa o token a cada visita.

- **Aviso "Next.js ignored package-lock.json in C:\Users\…"**: causado por um `package-lock.json` num diretório pai. Corrigido fixando `turbopack.root` em `next.config.ts`.
