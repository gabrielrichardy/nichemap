# Setup e evidências

## Origem e contexto

- Data: 2026-10-17.
- Toolkit: `soumatheusgomes/vibe-coding-toolkit`, revisão `f13bb354363dafef8ce8d8f605856cc9e1cc52cc` (commit de 2026-10-15), clonada em diretório temporário fora do projeto. Receita: `docs/prompts/11-next-project-bootstrap.md`, com as regras de `docs/prompts/12-existing-project-setup.md` para a parte de adoção, porque o usuário entregou um app existente.
- Base: repositório `gabrielrichardy/niche-intelligence` (renomeado para `nichemap`), branch `main` em `e290087`. O setup foi feito primeiro sobre um zip mais antigo do protótipo e depois reaplicado sobre o `main` do GitHub na branch `chore/nichemap-bootstrap`, preservando busca por `?target`, Graph API v25, verificação de domínio da Meta, CI, CODEOWNERS e templates.
- Cliente: Claude Code (desktop). Codex CLI também presente na máquina. Windows 11, Node 24.20.0, npm 11.19.0.
- Delegação: nenhuma neste setup; tudo feito pelo agente principal, modelo da sessão preservado.

## Decisões e fontes

| Decisão | Motivo | Fonte |
|---|---|---|
| Não rodar `create-next-app`; adotar o protótipo | App já atende App Router + TS + Tailwind + ESLint + `src/` + `@/*`; o toolkit proíbe regenerar app existente | toolkit `04-project-bootstrap.md` |
| npm em vez de pnpm | Lockfile npm existente; pnpm nem está instalado | toolkit `06-project-defaults.md` |
| Next/eslint-config-next/@next/env → 16.4.2 | Último estável na mesma major | `npm view`, 2026-10-17 |
| ESLint 9 e TypeScript 5 mantidos | 10.x e 7.x são majors novas | `npm view`, 2026-10-17 |
| `@types/node` ^20 → ^24 | Alinhar ao runtime Node 24 e ao peer do Vitest 5 (`^22 \|\| >=24`) | `npm view vitest peerDependencies` |
| `turbopack.root` fixo | Aviso de raiz inferida por lockfile em diretório pai | Context7 `/vercel/next.js` (turbopack.mdx) |
| Web mobile-first, sem Expo | Escolha do usuário | conversa, 2026-10-17 |
| Better Auth 1.7.7 (versão exata) para login com Google | Suporta Next 16 App Router, adaptador Drizzle/PostgreSQL e Google; peers `next ^16`, `drizzle-orm ^0.45.2`. 1.7.7 era a versão estável mais recente com 2+ semanas | `npm view better-auth time peerDependencies`, Context7 `/better-auth/better-auth` (instalação, Next.js, Google, Drizzle), 2026-10-18 |
| Fonte não oficial para contas pessoais: Apify `apify~instagram-profile-scraper`, plano Free, sem cartão | Conta pessoal pública não aparece na `business_discovery`. Escolha do dono (2026-10-19) entre Apify, HikerAPI e biblioteca privada: Apify não exige login de conta nossa no Instagram. Custo conferido nas páginas de preço apify.com/pricing e apify.com/apify/instagram-profile-scraper, consultadas em 2026-10-19: Free com US$ 5/mês de crédito, US$ 2,60 por 1.000 perfis. Não subir de plano sem nova aprovação | Páginas de preço do Apify (2026-10-19); `docs/superpowers/specs/2026-10-19-fonte-nao-oficial-design.md` |
| `.env.local.example` consolidado em `.env.example` | Um único arquivo de exemplo com banco + Instagram; `.gitignore` versiona só `.env.example` | toolkit `templates/next/.env.example` |

## Componentes

| Componente | Ação e motivo | Escopo | Estado e evidência |
|---|---|---|---|
| Next + núcleo (Drizzle, pg, Zod, server-only, Pino, clsx, tailwind-merge, Vitest, drizzle-kit, @next/env, eslint-plugin-drizzle) | Instalado conforme o guia | Projeto | **Validado**: `npm run check` verde |
| Templates `templates/next/` | Copiados sem sobrescrever nada | Projeto | **Validado**: 3 suítes do template passam |
| ESLint perfil completo + `eslint-rules/` + self-check | `next-app.config.mjs.example` → `eslint.config.mjs` | Projeto | **Validado**: lint 0 problemas; self-check ok |
| Skills Vercel (8 web) + `find-skills` | Upstream conferido com `--list`: mesmos 8 nomes web + `vercel-react-native-skills` (omitida, sem mobile nativo) | Projeto (`.agents/skills/`, cópias em `.claude/skills/`, `skills-lock.json`), agentes `claude-code` e `codex`, modo `--copy` | **Validado na CLI** (`skills list`). Descoberta em nova sessão não testada |
| Superpowers | Plugin já ativo | Usuário | **Validado**: skills carregadas nesta sessão |
| Ponytail (`full`) | Declarado no projeto e aceito pelo usuário | `.claude/settings.json` (`extraKnownMarketplaces` + `enabledPlugins`) | **Validado** no Claude Code: skills `ponytail:*` carregadas e comando `/ponytail` respondeu. Codex: pendente (plugin Codex é global) |
| Caveman | Declarado no projeto | idem | **Validado** no Claude Code: skills `caveman:*` carregadas. Codex pendente |
| Context7 | Sem conexão ativa no início do setup | `.mcp.json` (Claude), `.codex/config.toml` (Codex) | **Validado** na sessão do Claude Code: `query-docs` em `/vercel/next.js` (server-only) respondeu. `claude mcp get context7` fora da sessão ainda mostra "Pending approval" para o projeto. Codex não testado |
| RTK | Instalado com autorização do usuário: `winget install rtk-ai.rtk` (0.50.0); `rtk init -g --auto-patch` (Claude) e `rtk init -g --codex` | Usuário (hook `PreToolUse` Bash em `~/.claude/settings.json`, `RTK.md`; backup `settings.json.bak-before-rtk-20261017`) | **Validado**: `rtk gain` responde; hook registrado. Atua a partir da próxima sessão (PATH novo) |
| Graphify | Instalado com autorização: `winget install astral-sh.uv` + `uv tool install graphifyy` (0.9.92) | Usuário (CLI); projeto (`.graphifyignore`, `graphify-out/` ignorado) | **Validado**: `graphify extract . --code-only --no-cluster` → 207 nós, 350 arestas. Nesta pasta temporária o caminho estoura 260 caracteres, então o grafo foi gerado numa cópia em caminho curto (caminhos relativos) |
| Navegador | Browser do app reaproveitado; Chrome DevTools MCP disponível na sessão | Cliente | **Validado**: painel aberto a 375 px |
| Fonte não oficial (Apify) | Implementada, desligada por padrão (`UNOFFICIAL_SOURCE_ENABLED` e `APIFY_TOKEN` ausentes). Liberada por conta no `/admin` | Projeto (`src/lib/apify.ts`, `src/lib/profile-source.ts`); Vercel (variáveis) | **Validado** com `fetch` mockado (testes unitários). **Pendente**: chamada real com token Apify (formato da resposta do actor não conferido em produção); cache de 6 h testado só por leitura da documentação |
| Memória | `claude-mem` e memória do Claude Code já existem | Usuário | Reaproveitado; Obsidian não aplicável (sem necessidade) |

Sobreposição de skills: as mesmas 9 skills já existem globalmente em `~/.claude/skills` (e `find-skills` em `~/.agents/skills`). Nada global foi alterado. As cópias locais garantem que o repositório funcione em outra máquina; nesta máquina a versão global pode ter precedência no Claude Code.

## Documentação criada

`PRODUCT.md` (novo), `README.md` (reescrito a partir do README do protótipo, conteúdo do Instagram movido para `docs/onboarding.md`), `AGENTS.md` (bloco gerado pelo Next preservado no topo + acordos do toolkit), `CLAUDE.md` (já era `@AGENTS.md`, mantido), `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md`, `docs/setup.md`. Não havia `product.md`.

## Verificações

Antes (protótipo como recebido, deps atualizadas): `eslint .` → 0 erros, 1 warning (`other` não usado em `instagram.ts`). Não havia scripts de tipos, testes ou check.

| Item | Estado | Evidência |
|---|---|---|
| `npm run lint` | Validado | 0 problemas (warning preexistente corrigido) |
| `npm run typecheck` | Validado | sem erros |
| `npm run lint:rules` | Validado | 3 regras `ok` |
| `npm test` | Validado | 5 arquivos, 14 testes |
| `npm run build` | Validado | rotas `/` (estática), `/api/instagram` (dinâmica) |
| `npm run check` | Validado | exit 0 |
| `npm run db:generate` | Validado sem conexão | "0 tables … nothing to migrate"; só `drizzle/meta/` |
| Banco real / migrations | Pendente | sem `DATABASE_URL` autorizado; nada aplicado |
| HTTP | Validado | `next start -p 3417`: `/` 200; `/api/instagram?target=biodev` → `source: "mock"`; `target=x){followers_count}` → 400 |
| Navegador 375×812 | Validado | sem rolagem horizontal, sem erros no console; problemas de UI em `docs/design.md` |
| Instagram Graph API real | Pendente | sem token; só o caminho mock foi exercido |
| `npm audit --omit=dev` | Validado | 0 vulnerabilidades |
| `npm audit` (completo) | Riscos conhecidos | 9 (4 moderadas, 5 altas), todas em dev: `eslint-config-next` → `@next/eslint-plugin-next`/`fast-glob`/`micromatch`/`braces`; `drizzle-kit` → `@esbuild-kit/*`/`esbuild ≤0.24.2`. A única "correção" é downgrade de major (`eslint-config-next@14`, `drizzle-kit@0.18`) — não aplicada. `brace-expansion` corrigido com `npm audit fix` sem `--force` |
| Recursos temporários | Encerrados | servidor da porta 3417 parado; clone do toolkit e zip extraído ficam em diretório temporário do sistema |

Mudanças em código do produto durante o setup: removido contador morto em `classifyThemes`; `targetUsernameSchema` (Zod) + 400 na rota para impedir injeção na expressão `fields` da Graph API; `instagram.ts` marcado `server-only`, credenciais via `getInstagramCredentials()` com `INSTAGRAM_BUSINESS_ID` validado, falhas registradas no logger; correções de UI mobile e acessibilidade listadas em `docs/design.md`. Após essas mudanças: `npm run check` exit 0 com 12 testes (14 após portar para o `main` do GitHub, com teste da rota); `/` 200 e `target=a,b` 400 em `next start`; 375 px sem rolagem horizontal nem erros no console.

Fonte não oficial (Apify): a conta Apify é criada no plano Free, sem cartão. Crédito de US$ 5/mês cobre cerca de 1.900 perfis; o consumo aparece no painel da Apify. Passo a passo de ativação em `docs/onboarding.md`.

Reexecução: rodar de novo `skills add` sobrescreve as mesmas cópias; `.mcp.json`, `.codex/config.toml` e `.claude/settings.json` têm uma entrada cada — conferir antes de acrescentar outra.

## Pendências e próxima entrega

1. Codex: confiar no projeto para carregar `.codex/config.toml`; Ponytail/Caveman no Codex exigem instalação global do plugin.
2. Graphify: rodar `graphify extract . --code-only --no-cluster` a partir de uma pasta com caminho curto (limite de 260 caracteres do Windows).
3. Token do Instagram: **resolvido** em 2026-10-18 (System User, validade “Nunca”); `/configuracoes` em produção mostrou “token válido” e o painel passou a `source: live` para @gabriel__richardy.
4. Banco: **resolvido** em 2026-10-18 — Neon `neon-coral-xylophone` ligado ao projeto; as variáveis são sensíveis (não baixáveis), então a migration 0000 foi aplicada pelo editor SQL da Vercel, comando a comando, com o registro de controle do Drizzle (validado antes num Postgres descartável e depois por consulta somente leitura). Falta `CRON_SECRET` para ligar a coleta diária.
5. Definir `INSTAGRAM_COMPETITORS` (concorrentes do Market Radar e de Oportunidades). Perfil padrão já definido: `INSTAGRAM_TARGET_USERNAME=gabriel__richardy`.
6. Pessoas (#4): seção oculta até escolher fonte. Oportunidades (#5) passam a vir dos concorrentes quando `INSTAGRAM_COMPETITORS` existir.
7. Vercel (2026-10-18): projeto renomeado para `nichemap`; domínio `nichemap-app.vercel.app` adicionado (`nichemap.vercel.app` pertence a outra conta). O antigo `niche-intelligence-six.vercel.app` continua ativo; se a verificação de domínio da Meta for configurada, use o domínio definitivo.
8. Fonte não oficial (2026-10-19): a regra de fallback usa só o código 100 da Graph API (`NOT_BUSINESS_CODE` em `src/lib/graph.ts`), que também é o código genérico de "parâmetro inválido". **Pendente:** com um token válido, chamar `business_discovery` para um perfil pessoal público e confirmar o `error_subcode` observado e restringir a regra a ele. Até lá, o caso fica registrado aqui e em `PRODUCT.md`.
9. Fonte não oficial: Apify ainda não foi chamada com token real. Antes de liberar clientes, testar com uma conta liberada e um perfil pessoal público: conferir o aviso "Fonte não oficial", o perfil exibido e o gasto de crédito na Apify.

Evidência da coleta diária (2026-10-18, local): Postgres 17 descartável na porta 5499, `snapshots.db.test.ts` passou (migration + upsert + histórico); `/api/cron/snapshot` respondeu 401 sem/errado e, com o segredo, chamou a Graph API real e registrou o erro 190 do token falso. Coleta bem-sucedida com token válido: não testada.

**Próxima entrega do MVP:** ligar a coleta em produção (itens 3–5) e acompanhar os primeiros dias de histórico.

Revisão sugerida: **4 ciclos** de code review — a mudança de setup é ampla em arquivos mas rasa em lógica; o risco real está na integração com a Graph API e na UI mobile. Focos: (1) segurança e dados da integração Instagram; (2) configuração/ambiente e quality gates; (3) acessibilidade e layout mobile; (4) revisão integrada com `npm run check`.

```text
Faça 4 ciclos de code review no Nichemap. Ciclo 1: segurança e dados em src/lib/instagram.ts e src/app/api/instagram/route.ts (token, validação, erros, fallback). Ciclo 2: ambiente e configuração (.env.example, src/lib/env*.ts, src/db, next.config.ts, eslint.config.mjs). Ciclo 3: acessibilidade e layout mobile a 375 px (src/components, docs/design.md). Ciclo 4: revisão integrada. Em cada ciclo registre achados com severidade, arquivo:linha, evidência e correção proposta; aplique só correções pequenas e seguras e rode npm run check ao final de cada ciclo.
```
