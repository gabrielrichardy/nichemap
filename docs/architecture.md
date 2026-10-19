# Código e arquitetura

## Stack efetiva

| Peça | Versão | Observação |
|---|---|---|
| Node.js | 24 (validado com 24.20.0) | `engines.node >= 24`; `pg` exige runtime Node, não Edge |
| npm | 11 | Gerenciador herdado do protótipo; lockfile `package-lock.json` |
| Next.js | 16.4.2 | App Router, Turbopack; `turbopack.root` fixado em `next.config.ts` |
| React | 19.2.8 | |
| TypeScript | 5.x strict | |
| Tailwind CSS | 4 | via `@tailwindcss/postcss` |
| Recharts / lucide-react | 3.x / 1.x | gráficos e ícones do painel |
| Drizzle ORM / drizzle-kit / pg | 0.45 / 0.31 / 8.23 | instalados, schema ainda vazio |
| Zod / Pino / Vitest | 4.6 / 10.4 / 5.0 | |

Versões exatas ficam no lockfile.

## Mapa do código

```
src/
  app/
    layout.tsx               raiz HTML (lang pt-BR), metadados e meta tag de verificação da Meta (META_VERIFICATION_CODE)
    page.tsx                 Dashboard: lê ?target e monta AppShell + DashboardClient (busca /api/instagram no cliente)
    scanner, conteudo, mercado, empresas, oportunidades, relatorios/
                             páginas de seção (Server Components): loadDashboard() + Section
    configuracoes/page.tsx   estado das integrações via getIntegrationStatus()
    entrar/, perfil/, conta/, plano/, admin/
                             login (Google), escolha do @ com confirmação, minha conta (excluir), plano bloqueado, painel de admin
    privacidade/, termos/    páginas legais públicas (rascunho)
    api/auth/[...all]/       rotas do Better Auth (503 sem login configurado)
    globals.css              tokens CSS e Tailwind
    api/instagram/route.ts   GET: valida ?target e devolve DashboardData (real ou mock)
    api/cron/snapshot/       GET diário (vercel.json): grava um snapshot por perfil acompanhado
  components/
    AppShell.tsx             Sidebar (menu desktop + menu celular) + Header + <main>
    Section.tsx              título, erro de perfil inválido e DataSourceBanner das páginas de seção
    ContentList, PrintButton, DataSourceBanner
    DashboardClient.tsx      busca /api/instagram e distribui os dados
    KpiCards, GrowthChart, ContentTypeDonut, ThemeAnalysis, MarketTable,
    TopContent, RelevantPeople, Opportunities, ProfileHeader, Header, Sidebar
  lib/
    instagram.ts             monta DashboardData (perfil, conteúdo, temas, concorrentes, histórico); resolveTarget(); collectDailySnapshots()
    graph.ts                 chamadas à Graph API, mensagens de erro pt-BR (token 190, permissão, limite), engajamento
    themes.ts                temas automáticos: termos/hashtags presentes em mais legendas, sem lista fixa (puro, testado)
    growth.ts                cálculo de crescimento a partir dos snapshots (puro, testado)
    snapshots.ts             grava/lê profile_snapshots (server-only)
    cron.ts                  autorização do Vercel Cron (Bearer CRON_SECRET, comparação em tempo constante)
    dashboard.ts             loadDashboard()/readTarget() para as páginas de seção (server-only)
    settings.ts              getIntegrationStatus(): só estados, nunca valores (server-only)
    nav.ts                   lista das seções e withTarget()
    auth.ts / auth-client.ts Better Auth (Google + Drizzle), campos do usuário server-owned (input: false)
    viewer.ts                getViewer/requireViewer/requireAdmin/targetFor: quem é o visitante, redirecionamentos, alvo
    access.ts                planos e acesso por seção (puro, testado)
    accounts.ts              travar/destravar @, plano, exclusão, listagem e estatísticas de contas
    onboarding.ts            busca do perfil antes de travar (mensagens pt-BR)
    mockData.ts              dados de exemplo
    types.ts                 DashboardData e tipos de cada bloco
    env-schema.ts / env.ts   validação de ambiente (Zod); env.ts é server-only
    logger.ts                Pino server-only com redação de segredos
    utils.ts                 cn() = clsx + tailwind-merge
  db/
    index.ts                 getDb() lazy, pool pg (max 5) reutilizado entre HMR; closeDatabase()
    schema/index.ts          vazio até a primeira tabela
drizzle.config.ts            gera SQL em drizzle/ sem precisar de conexão
eslint.config.mjs + eslint-rules/   perfil completo do toolkit
scripts/verify-quality-rules.mjs    self-check das regras locais
```

`drizzle/` contém só `meta/` (nenhuma migration gerada, pois não há tabelas).

## Fronteiras e fluxo

1. `page.tsx` (servidor) usa `?target` da URL ou `INSTAGRAM_TARGET_USERNAME` e passa o alvo ao `Header` (busca, que navega para `/?target=`) e ao `DashboardClient` (com `key={target}`, que zera o estado a cada busca).
2. `DashboardClient` (cliente) chama `GET /api/instagram?target=…`.
3. A rota remove um `@` inicial e valida `target` com `targetUsernameSchema` (letras, dígitos, `.`, `_`, até 30) — o valor é interpolado na expressão `fields` da Graph API, então qualquer outro caractere é rejeitado com 400.
4. `getDashboardData` (módulo `server-only`) lê as credenciais por `getInstagramCredentials()` em `src/lib/env.ts`, que valida `INSTAGRAM_BUSINESS_ID` como numérico. Sem credenciais, devolve mock. Com configuração inválida ou erro da API, registra um `warn` no logger e devolve mock com o motivo em `note`.
5. A resposta é um `DashboardData` com `source: "live" | "mock"`, que a UI usa para mostrar o aviso.

O token nunca chega ao cliente. `src/app` e `src/components` não podem importar `@/db` (regra de lint); o acesso a dados futuro fica em módulos de `src/lib` ou de funcionalidade.

Limitações conhecidas do fluxo atual:

- `business_discovery` não entrega histórico nem visualizações: o crescimento vem só dos snapshots diários (sem banco ou com menos de 2 dias, o gráfico fica vazio com aviso) e `views` fica indefinido com dados reais.
- Profile score (`src/lib/profileScore.ts`): 4 critérios de 25 pontos (engajamento vs. 3%, publicações nos últimos 30 dias vs. 12, variedade de formatos, bio + legendas). Cada critério abaixo do máximo traz uma dica; o card do score abre esse detalhamento ao clicar.
- Sem `INSTAGRAM_COMPETITORS`, Mercado e Oportunidades usam dados de exemplo mesmo com token; `sampleSections` marca esses blocos e a UI mostra o selo “Exemplo”. Com concorrentes, ambos são reais (Oportunidades = `buildOpportunities`, score = engajamento × 10). Pessoas foi removida até haver fonte (#4).
- Cada visita a uma página consulta a Graph API (perfil + até 10 concorrentes), sem cache. Revisar se o limite de chamadas da Meta aparecer.
- O token vai como `access_token` na query string da Graph API (formato documentado pela Meta); não é registrado em log.

## Login e autorização

- Better Auth com Google; sessões no banco (sem cache em cookie), lidas a cada request por `getViewer()`. `getViewer()` sempre lê `headers()`, então nenhuma página que depende do visitante é pré-renderizada.
- Toda página do painel chama `requireViewer(href)` antes de buscar dados: sem sessão → `/entrar`; cliente sem @ → `/perfil`; fora do plano → `/plano`; Configurações e `/admin` → 404 para clientes. `/api/instagram` aplica as mesmas regras (401/403/503).
- Cliente: alvo = @ travado (`?target` ignorado), sem chamadas de concorrentes fora do Completo, sem dados de exemplo (mostra "Dados indisponíveis"). Admin: comportamento anterior.
- `plan`, `instagramUsername`, `termsAcceptedAt`, `lastSeenAt` são `input: false` no Better Auth: `/api/auth/update-user` rejeita esses campos (teste de integração).
- Server actions de admin chamam `requireAdmin()` e validam com Zod.
- Risco: todas as visitas de todos os clientes usam o token do dono na Graph API, sem cache; com muitos clientes o limite da Meta pode estourar.

## Dados e migrations

- Schema Drizzle em `src/db/schema/index.ts`, exportado para `getDb()`. Tipos via `$inferSelect`/`$inferInsert` quando houver tabelas.
- `npm run db:generate` gera SQL em `drizzle/` sem conexão; revise o SQL. `npm run db:migrate` usa `DATABASE_URL_UNPOOLED` ou `DATABASE_URL` e só deve rodar contra um banco autorizado.
- Pool: `max: 5`, timeout de conexão 5 s, ocioso 30 s; criado na primeira chamada a `getDb()`, então build e testes não precisam de banco.
- `profile_snapshots` (`drizzle/0000_profile_snapshots.sql`): `username`, `taken_on` (dia no fuso de Brasília), `followers`, `media_count`, `engagement_pct`; índice único (`username`, `taken_on`) usado pelo upsert diário e pelas consultas por período.
- `user`, `session`, `account`, `verification` (`drizzle/0001_auth.sql`): tabelas do Better Auth; `user` tem `plan` (padrão `basico`), `instagram_username` (único), `terms_accepted_at`, `last_seen_at` (último login). Sessões e contas Google apagam em cascata com o usuário.
- `subscription`, `billing_event` e `user.complimentary` (`drizzle/0002_billing.sql`): `subscription` guarda a assinatura Asaas da conta (uma por usuário, apaga em cascata) com `plan`, `cycle`, `status`, `period_end`, `overdue_since`, `scheduled_plan` e `invoice_url` (cobrança em aberto); `billing_event` registra os eventos de webhook do Asaas pelo id do evento (idempotência); `complimentary` (padrão `false`) marca conta cortesia, nunca cobrada.
- Coleta: Vercel Cron chama `/api/cron/snapshot` às 11:00 UTC com `Authorization: Bearer $CRON_SECRET`; grava o perfil padrão, os concorrentes e os perfis travados pelos clientes. Só grava dados reais (exige token).
- Leitura: `getDashboardData` busca os últimos 30 dias; se o banco falhar, o painel segue sem histórico e registra `warn` no log.

## Decisões

| Decisão | Motivo | Fonte/data | Revisar quando |
|---|---|---|---|
| Adotar o protótipo `niche-intelligence` em vez de gerar novo scaffold | Já é Next App Router + TS + Tailwind + ESLint + `src/` + `@/*`; o toolkit proíbe regenerar app existente | toolkit `docs/04-project-bootstrap.md`, 2026-10-17 | — |
| Aplicar o bootstrap sobre o `main` do GitHub (`niche-intelligence`), não sobre o zip | O GitHub tinha 10 commits a mais (busca por `?target`, Graph v25, verificação Meta, CI, layout); sobrescrever apagaria isso e o deploy da Vercel | `git diff` zip × `origin/main`, 2026-10-17 | — |
| CI em Node 24 com testes no job `lint` | Alinha ao runtime do projeto (Vitest 5 e `engines`); mantém os nomes de checks exigidos pela proteção da `main` | `.github/workflows/ci.yml` | Se a proteção de branch mudar |
| Remover a curva de crescimento estimada | Era inventada (fatores fixos) e aparecia como dado real; substituída por snapshots reais ou estado vazio | AGENTS.md (não simular integrações) | — |
| Coleta diária via Vercel Cron + upsert por dia | Plano Hobby permite cron diário; upsert torna reexecução segura | Docs Vercel Cron via Context7, 2026-10-18 | Se precisar de mais de uma coleta por dia |
| Concorrentes via `business_discovery` (INSTAGRAM_COMPETITORS) | Mesma API e token já usados; sem serviço pago | Graph API v25 | Se precisar de mais de 10 perfis ou de dados que a API não dá |
| Temas por frequência nas legendas (sem IA) | Lê o nicho do próprio conteúdo, grátis e explicável; junta variações com/sem acento | Pedido do usuário, 2026-10-18 | Se quiser leitura semântica: classificar com LLM (custo de API, chave nova) |
| Ocultar Pessoas | Não há fonte de dados de pessoas sem serviço externo | Decisão do usuário, 2026-10-18 | Quando houver fonte (#4) |
| Manter npm | Lockfile npm existente; toolkit manda preservar o gerenciador | idem | Troca deliberada de gerenciador |
| Next 16.3.3 → 16.4.2 (minor) | Canal estável mais recente, mesma major; `eslint-config-next` e `@next/env` alinhados | npm registry, 2026-10-17 | Próxima major |
| Manter ESLint 9 e TypeScript 5 | ESLint 10 e TS 7 são majors novas; fora do escopo do bootstrap | npm registry, 2026-10-17 | Tarefa própria de atualização |
| `turbopack.root` = pasta do projeto | Um `package-lock.json` solto num diretório pai fazia o Next inferir a raiz errada | Next docs via Context7 (`/vercel/next.js`, turbopack.mdx), 2026-10-17 | Se virar monorepo |
| Better Auth 1.7.7 com Google | Login sem senha guardada; adaptador Drizzle; campos server-owned com `input: false` | Context7 `/better-auth/better-auth`, `npm view`, 2026-10-18 | Upgrade de major ou novo provedor |
| Planos por seção em `access.ts`, aplicados no servidor | Bloqueio não pode ser só visual | Spec de login, 2026-10-18 | Cobrança automática |
| Drizzle + PostgreSQL | Default do toolkit; necessidade concreta: snapshots diários | `PRODUCT.md` | Se o produto dispensar histórico |

## Manutenção

Atualize este mapa ao alterar diretórios, dependências relevantes, contratos ou fronteiras. Registre comportamento comprovado; remova decisões que deixaram de valer.
