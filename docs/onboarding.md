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

## Banco

1. Tenha um PostgreSQL de desenvolvimento (local ou provedor) — nunca produção para testes.
2. Defina `DATABASE_URL` (e `DATABASE_URL_UNPOOLED`, se necessário) no `.env.local`.
3. Ao criar/alterar tabelas em `src/db/schema/`, rode `npm run db:generate` e revise o SQL em `drizzle/`.
4. Aplique com `npm run db:migrate` somente no banco correto.

A tabela `profile_snapshots` (migration `drizzle/0000_profile_snapshots.sql`) guarda um registro por perfil por dia.

### Banco de produção (Vercel)

1. Na Vercel: **Storage > Create Database > Neon (Postgres)** e conecte ao projeto. Isso cria `DATABASE_URL` (e `DATABASE_URL_UNPOOLED`) nas variáveis do projeto.
2. Localmente, com autorização para mexer no banco de produção: `vercel env pull .env.production.local` e depois `npm run db:migrate` (o `drizzle.config.ts` carrega esse arquivo pelo `@next/env`). Apague o `.env.production.local` ao terminar; ele é ignorado pelo Git, mas contém segredos.
3. Crie `CRON_SECRET` nas variáveis da Vercel e faça um novo deploy. A coleta roda todo dia às 11:00 UTC; para disparar na hora: `curl -H "Authorization: Bearer $CRON_SECRET" https://<seu-domínio>/api/cron/snapshot`.

### Testar contra um Postgres descartável

O teste `src/lib/snapshots.db.test.ts` só roda com `TEST_DATABASE_URL` apontando para um banco **descartável** (ele aplica a migration e apaga a tabela). Exemplo com o PostgreSQL local, sem senha, numa pasta temporária:

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
