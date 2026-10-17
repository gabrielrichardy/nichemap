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
    page.tsx                 Server Component: lê ?target (ou o padrão do ambiente) e monta Sidebar, Header e DashboardClient
    globals.css              tokens CSS e Tailwind
    api/instagram/route.ts   GET: valida ?target e devolve DashboardData (real ou mock)
  components/                blocos visuais do painel (Client Components)
    DashboardClient.tsx      busca /api/instagram e distribui os dados
    KpiCards, GrowthChart, ContentTypeDonut, ThemeAnalysis, MarketTable,
    TopContent, RelevantPeople, Opportunities, ProfileHeader, Header, Sidebar
  lib/
    instagram.ts             Graph API (business_discovery), métricas, temas, fallback mock
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

- Com dados reais, `growth` é estimado (fatores fixos sobre os seguidores atuais) e `views` repete `likes`, porque `business_discovery` não entrega histórico nem visualizações. A `note` avisa sobre o crescimento.
- O token vai como `access_token` na query string da Graph API (formato documentado pela Meta); não é registrado em log.

## Dados e migrations

- Schema Drizzle em `src/db/schema/index.ts`, exportado para `getDb()`. Tipos via `$inferSelect`/`$inferInsert` quando houver tabelas.
- `npm run db:generate` gera SQL em `drizzle/` sem conexão; revise o SQL. `npm run db:migrate` usa `DATABASE_URL_UNPOOLED` ou `DATABASE_URL` e só deve rodar contra um banco autorizado.
- Pool: `max: 5`, timeout de conexão 5 s, ocioso 30 s; criado na primeira chamada a `getDb()`, então build e testes não precisam de banco.
- Primeira tabela prevista (ainda não criada): snapshots diários do perfil — ver `PRODUCT.md`.

## Decisões

| Decisão | Motivo | Fonte/data | Revisar quando |
|---|---|---|---|
| Adotar o protótipo `niche-intelligence` em vez de gerar novo scaffold | Já é Next App Router + TS + Tailwind + ESLint + `src/` + `@/*`; o toolkit proíbe regenerar app existente | toolkit `docs/04-project-bootstrap.md`, 2026-10-17 | — |
| Aplicar o bootstrap sobre o `main` do GitHub (`niche-intelligence`), não sobre o zip | O GitHub tinha 10 commits a mais (busca por `?target`, Graph v25, verificação Meta, CI, layout); sobrescrever apagaria isso e o deploy da Vercel | `git diff` zip × `origin/main`, 2026-10-17 | — |
| CI em Node 24 com testes no job `lint` | Alinha ao runtime do projeto (Vitest 5 e `engines`); mantém os nomes de checks exigidos pela proteção da `main` | `.github/workflows/ci.yml` | Se a proteção de branch mudar |
| Manter npm | Lockfile npm existente; toolkit manda preservar o gerenciador | idem | Troca deliberada de gerenciador |
| Next 16.3.3 → 16.4.2 (minor) | Canal estável mais recente, mesma major; `eslint-config-next` e `@next/env` alinhados | npm registry, 2026-10-17 | Próxima major |
| Manter ESLint 9 e TypeScript 5 | ESLint 10 e TS 7 são majors novas; fora do escopo do bootstrap | npm registry, 2026-10-17 | Tarefa própria de atualização |
| `turbopack.root` = pasta do projeto | Um `package-lock.json` solto num diretório pai fazia o Next inferir a raiz errada | Next docs via Context7 (`/vercel/next.js`, turbopack.mdx), 2026-10-17 | Se virar monorepo |
| Drizzle + PostgreSQL | Default do toolkit; necessidade concreta: snapshots diários | `PRODUCT.md` | Se o produto dispensar histórico |

## Manutenção

Atualize este mapa ao alterar diretórios, dependências relevantes, contratos ou fronteiras. Registre comportamento comprovado; remova decisões que deixaram de valer.
