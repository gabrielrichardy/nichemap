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
    api/cron/billing/        GET diário às 12:00 UTC (vercel.json): roda os prazos da cobrança (runBillingTick)
    api/billing/webhook/     POST: avisos do Asaas; token em asaas-access-token, 401 se errado; 500 se falhar (Asaas reenvia)
    plano/                   planos, preços, Assinar (formulário de CPF/CNPJ) e mudança de plano
    conta/actions.ts         server actions de Minha conta: mudar plano, cancelar assinatura, excluir conta
  components/
    AppShell.tsx             Sidebar (menu desktop + menu celular) + Header + <main>
    Section.tsx              título, erro de perfil inválido e DataSourceBanner das páginas de seção
    ContentList, PrintButton, DataSourceBanner
    DashboardClient.tsx      busca /api/instagram e distribui os dados
    KpiCards, GrowthChart, ContentTypeDonut, ThemeAnalysis, MarketTable,
    TopContent, RelevantPeople, Opportunities, ProfileHeader, Header, Sidebar
  lib/
    instagram.ts             monta DashboardData (perfil, conteúdo, temas, concorrentes, histórico); resolveTarget(); collectDailySnapshots()
    graph.ts                 chamadas à Graph API, mensagens de erro pt-BR (token 190, permissão, limite), engajamento, recusa "não comercial" (código 100)
    apify.ts                 fonte não oficial: chamada ao actor da Apify (perfil público), validação Zod, cache de 6 h, perfil privado (server-only)
    profile-source.ts        decisão de fonte: Graph primeiro; Apify só na recusa "não comercial" e se a conta puder usar (server-only)
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
    accounts.ts              travar/destravar @, plano, fonte não oficial por conta, exclusão, listagem e estatísticas de contas
    asaas.ts                 cliente HTTP da API do Asaas (fetch, chave no header, timeout de 10 s); erros sem corpo de resposta
    billing-plans.ts         preços (constante; mudar preço = PR) e formatação em BRL
    billing-rules.ts         regras puras: (situação + evento + data) → (nova situação + plano); sem banco nem rede
    billing.ts               checkout, mudança de plano, cancelamento e resumo da assinatura (escreve subscription e user.plan na mesma transação)
    billing-sync.ts          webhook (token, idempotência em billing_event) e coleta diária de prazos (runBillingTick)
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
5. A resposta é um `DashboardData` com `source: "live" | "mock" | "unofficial"`, que a UI usa para mostrar o aviso.

Fonte não oficial (Apify), decidida em `fetchProfileWithFallback` (`src/lib/profile-source.ts`):

1. A Graph API é sempre tentada primeiro.
2. Só a recusa "não comercial" (`isNotBusinessError`, código 100) pode cair para a Apify. Qualquer outro erro (token, limite, Meta fora do ar) é relançado sem gastar crédito.
3. A Apify só é chamada se `getApifyToken()` existir (`UNOFFICIAL_SOURCE_ENABLED` = `"true"` e `APIFY_TOKEN`) e o visitante puder usá-la: admin, ou conta com `user.unofficial_source = true` olhando o próprio @ travado (`dashboardOptionsFor` e `lookupProfile`).
4. Sem essas condições, a recusa vira `SourceDisabledError` (mensagem de fonte desativada para o cliente; exemplo com motivo para o admin).
5. Competidores (Market Radar) nunca usam a Apify. Na coleta diária, a Apify só vale para @ travados de contas liberadas; se um mesmo @ for concorrente e também travado de um cliente liberado, ele não recebe fallback (fica sem dados, como os demais concorrentes recusados).
6. O resultado da Apify fica em cache por 6 h por @ (`unstable_cache` do Next, chave sem o token). Erros não são cacheados.
7. Perfil privado vira `PrivateProfileError` ("Perfis privados não funcionam..."), também no travamento.

O token nunca chega ao cliente. `src/app` e `src/components` não podem importar `@/db` (regra de lint); o acesso a dados futuro fica em módulos de `src/lib` ou de funcionalidade.

Limitações conhecidas do fluxo atual:

- `business_discovery` não entrega histórico nem visualizações: o crescimento vem só dos snapshots diários (sem banco ou com menos de 2 dias, o gráfico fica vazio com aviso) e `views` fica indefinido com dados reais.
- Profile score (`src/lib/profileScore.ts`): 4 critérios de 25 pontos (engajamento vs. 3%, publicações nos últimos 30 dias vs. 12, variedade de formatos, bio + legendas). Cada critério abaixo do máximo traz uma dica; o card do score abre esse detalhamento ao clicar.
- Sem `INSTAGRAM_COMPETITORS`, Mercado e Oportunidades usam dados de exemplo mesmo com token; `sampleSections` marca esses blocos e a UI mostra o selo “Exemplo”. Com concorrentes, ambos são reais (Oportunidades = `buildOpportunities`, score = engajamento × 10). Pessoas foi removida até haver fonte (#4).
- Cada visita a uma página consulta a Graph API (perfil + até 10 concorrentes), sem cache. Revisar se o limite de chamadas da Meta aparecer.
- O token vai como `access_token` na query string da Graph API (formato documentado pela Meta); não é registrado em log.
- Fonte não oficial: a Apify devolve só alguns posts recentes e não traz visualizações. O formato da resposta do actor (`apify~instagram-profile-scraper`) ainda não foi conferido com chamada real; a regra de recusa usa só o código 100 da Graph (ver `docs/setup.md`, pendência 8).

## Login e autorização

- Better Auth com Google; sessões no banco (sem cache em cookie), lidas a cada request por `getViewer()`. `getViewer()` sempre lê `headers()`, então nenhuma página que depende do visitante é pré-renderizada.
- Toda página do painel chama `requireViewer(href)` antes de buscar dados: sem sessão → `/entrar`; cliente sem @ → `/perfil`; fora do plano → `/plano`; Configurações e `/admin` → 404 para clientes. `/api/instagram` aplica as mesmas regras (401/403/503).
- Cliente: alvo = @ travado (`?target` ignorado), sem chamadas de concorrentes fora do Completo, sem dados de exemplo (mostra "Dados indisponíveis"). Admin: comportamento anterior.
- Liberação da fonte não oficial: coluna `user.unofficial_source` (padrão `false`), alterada só por `setUnofficialSource` em `src/app/admin/actions.ts` (`requireAdmin()`); não aparece para o cliente.
- `plan`, `instagramUsername`, `termsAcceptedAt`, `lastSeenAt` são `input: false` no Better Auth: `/api/auth/update-user` rejeita esses campos (teste de integração).
- Server actions de admin chamam `requireAdmin()` e validam com Zod.
- Risco: todas as visitas de todos os clientes usam o token do dono na Graph API, sem cache; com muitos clientes o limite da Meta pode estourar.

## Dados e migrations

- Schema Drizzle em `src/db/schema/index.ts`, exportado para `getDb()`. Tipos via `$inferSelect`/`$inferInsert` quando houver tabelas.
- `npm run db:generate` gera SQL em `drizzle/` sem conexão; revise o SQL. `npm run db:migrate` usa `DATABASE_URL_UNPOOLED` ou `DATABASE_URL` e só deve rodar contra um banco autorizado.
- Pool: `max: 5`, timeout de conexão 5 s, ocioso 30 s; criado na primeira chamada a `getDb()`, então build e testes não precisam de banco.
- `profile_snapshots` (`drizzle/0000_profile_snapshots.sql`): `username`, `taken_on` (dia no fuso de Brasília), `followers`, `media_count`, `engagement_pct`; índice único (`username`, `taken_on`) usado pelo upsert diário e pelas consultas por período.
- `user`, `session`, `account`, `verification` (`drizzle/0001_auth.sql`): tabelas do Better Auth; `user` tem `plan` (padrão `basico`), `instagram_username` (sem unicidade desde `drizzle/0002`: várias contas podem travar o mesmo @; a coleta diária grava cada @ uma vez), `terms_accepted_at`, `last_seen_at` (último login). Sessões e contas Google apagam em cascata com o usuário.
- `subscription`, `billing_event` e `user.complimentary` (`drizzle/0004_billing.sql`): `subscription` guarda a assinatura Asaas da conta (uma por usuário, apaga em cascata) com `plan`, `cycle`, `status`, `period_end`, `overdue_since`, `scheduled_plan` e `invoice_url` (cobrança em aberto); `billing_event` registra os eventos de webhook do Asaas pelo id do evento (idempotência); `complimentary` (padrão `false`) marca conta cortesia, nunca cobrada.
- `user.unofficial_source` (`drizzle/0003_clever_overlord.sql`, `boolean not null default false`): liberação da fonte não oficial por conta. Migration gerada, ainda não aplicada sem autorização.
- Coleta: Vercel Cron chama `/api/cron/snapshot` às 11:00 UTC com `Authorization: Bearer $CRON_SECRET`; grava o perfil padrão, os concorrentes e os perfis travados pelos clientes. Só grava dados reais (exige token).
- Cobrança: Vercel Cron chama `/api/cron/billing` às 12:00 UTC com o mesmo `CRON_SECRET`; roda os prazos (3 dias de tolerância, fim do período pago após cancelar, 30 dias de atraso).

## Cobrança (Asaas)

Fluxo, em ordem:

1. **Checkout** (`startCheckout` em `billing.ts`): o servidor cria ou reutiliza o cliente no Asaas e a assinatura, com `externalReference` = id do usuário, grava a linha `subscription` e redireciona para a primeira cobrança no Asaas. O CPF/CNPJ vai ao Asaas e não é guardado no Nichemap.
2. **Webhook** (`POST /api/billing/webhook`): confere o token (`asaas-access-token`, comparação em tempo constante), grava o id do evento em `billing_event` (se já existe, responde 200 sem reprocessar) e chama `handleAsaasEvent`.
3. **Consulta no Asaas** (`billing-sync.ts`): o aviso só dá os ids. O módulo busca a cobrança ou a assinatura na API e decide a partir dela, não a partir do conteúdo do aviso. Antes de reativar uma conta em atraso por um pagamento, lista as cobranças ainda vencidas da assinatura (`listOverduePayments`); se sobrar alguma, a conta segue em atraso desde a mais antiga.
4. **Regras** (`billing-rules.ts`, função pura): situação atual + evento + data → nova situação e plano. Testada sem banco e sem rede.
5. **Escrita**: `saveOutcome` atualiza `subscription` e `user.plan` na mesma transação, com a trava da linha `user` (mesma ordem de trava que o webhook usa, evitando deadlock). Falha → 500 e o evento não fica marcado como processado, então o Asaas reenvia.
6. **Prazos**: `runBillingTick` (cron diário, e também ao carregar a conta) aplica os prazos das regras.

Quem controla o acesso continua sendo `user.plan` (`access.ts`, `requireViewer`). O módulo de cobrança é o único que escreve nele, e só para contas com assinatura. Cortesia (`user.complimentary`) nunca passa por cobrança, cron ou webhook. Mudança manual de plano no admin fica bloqueada enquanto houver assinatura aberta ou período pago em andamento.

Eventos tratados pelo webhook: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED`. `PAYMENT_DELETED` é ignorado de propósito: remover a cobrança não muda o acesso, e checkouts abandonados encerram pelo prazo de 30 dias.

Tabelas: `subscription` (uma por usuário, cascata com `user`) e `billing_event` (id do evento como chave primária, para idempotência), em `drizzle/0004_billing.sql`. Schema em `src/db/schema/billing.ts`.
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
| Asaas como provedor de cobrança (sem SDK, `fetch` direto) | Mais barato nos três meios, Pix Automático, nota fiscal automática, sandbox e página de pagamento hospedada | `docs/superpowers/specs/2026-10-19-cobranca-design.md`, docs.asaas.com, 2026-10-19 | Se a taxa mudar ou houver CNPJ |
| Webhook decide a partir da consulta na API, não do conteúdo do aviso | Aviso sem token ou adulterado não pode liberar plano | Spec de cobrança, "Como funciona por dentro" | — |
| `billingType: UNDEFINED` na assinatura | Doc do Asaas aceita, pagador escolhe o meio na fatura; **cobrança automática do cartão e Pix Automático não confirmados** | docs.asaas.com, 2026-10-19 | Após o teste no sandbox |
| Cortesia como coluna própria (`user.complimentary`), não como plano | Não se confunde com quem paga por fora e nunca passa por cobrança | Spec de cobrança, "Admin", 2026-10-19 | — |
| Apify (`apify~instagram-profile-scraper`) como plano B para conta pessoal, só em contas liberadas | Teste desligável pedido pelo dono; custo zero no Free; sem login de conta própria no Instagram | Spec `2026-10-19-fonte-nao-oficial-design.md`, preço Apify em 2026-10-19 | Cobrança, fornecedor sair, ou Meta bloquear; ou se o código 100 não for confirmado |

## Manutenção

Atualize este mapa ao alterar diretórios, dependências relevantes, contratos ou fronteiras. Registre comportamento comprovado; remova decisões que deixaram de valer.
