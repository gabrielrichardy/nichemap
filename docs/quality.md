# Qualidade

## Comandos

| Script | O que prova |
|---|---|
| `npm run lint` | ESLint (`eslint .`): presets Next core-web-vitals + TypeScript e regras locais |
| `npm run typecheck` | `tsc --noEmit` em modo strict |
| `npm run lint:rules` | Self-check das regras `quality/*` com o RuleTester do ESLint |
| `npm test` | Vitest em Node: `src/**/*.test.ts` |
| `npm run build` | Build de produção do Next (não roda lint) |
| `npm run check` | Todos os anteriores, em sequência |

Na CI (`.github/workflows/ci.yml`, Node 24), o job `lint` roda lint, typecheck, `lint:rules` e testes; o job `build` roda o build. Esses dois nomes são os checks obrigatórios da `main`.

Durante o trabalho, rode o teste do arquivo afetado (`npx vitest run src/lib/instagram.test.ts`); antes de concluir, `npm run check`.

## Regras de base

- TypeScript strict e presets oficiais `eslint-config-next`.
- `quality/max-lines`: no máximo 350 linhas por arquivo (testes e barrels isentos).
- `quality/no-direct-console`: sem `console.*` em `src/`; no servidor use `logger` de `src/lib/logger.ts`, no cliente remova o log.
- `quality/no-direct-data-access`: arquivos `.tsx` em `src/app/` e `src/components/` não importam `db`/`getDb` de `@/db`.
- `drizzle/enforce-delete-with-where` e `drizzle/enforce-update-with-where` para a variável `db`.
- Validação de entradas e ambiente com Zod; erros sem segredos.

## Estratégia de testes

Testes atuais (Node, sem rede nem banco):

- `src/lib/env.test.ts`: validação de `DATABASE_URL`/`LOG_LEVEL` sem vazar valores.
- `src/lib/logger.test.ts`: redação de segredos nos logs.
- `src/db/index.test.ts`: ciclo de vida do pool com `pg` mockado (não conecta).
- `src/app/api/instagram/route.test.ts`: sem login 401; cliente sem @ 403; cliente sempre recebe o próprio @ (sem concorrentes fora do Completo, sem lista completa de posts fora do Intermediário, 503 sem dados reais); admin com `@perfil` vira `perfil`; alvo inválido 400 sem chamar a API.
- `src/lib/themes.test.ts`: temas tirados do próprio conteúdo, acento/hashtag unificados, links/menções/palavras vazias ignorados.
- `src/lib/growth.test.ts`: crescimento só com 2+ dias, percentuais, dia no fuso de Brasília.
- `src/lib/graph.test.ts`: mensagens de erro da Graph API (token expirado, permissão, limite) sem vazar o token; cálculo de engajamento.
- `src/lib/cron.test.ts`: o cron só aceita `Bearer <CRON_SECRET>` exato; sem segredo, ninguém passa.
- `src/lib/snapshots.db.test.ts`: **integração com PostgreSQL real** (migration, upsert diário, histórico em ordem). Só roda com `TEST_DATABASE_URL` apontando para um banco descartável; a CI pula. Última execução: 2026-10-18, Postgres 17 local descartável, passou.
- `src/lib/access.test.ts`: tabela completa de acesso por seção e plano; admin acessa tudo.
- `src/lib/viewer.test.ts`: redirecionamentos (`/entrar`, `/perfil`, `/plano`), 404 de admin, alvo do cliente ignora `?target`, leitura de `headers()` sem login configurado.
- `src/lib/onboarding.test.ts`: mensagens da busca do perfil (inválido, indisponível, conta pessoal).
- `src/lib/auth.test.ts`: sem variáveis de login ou banco, `getAuth()` é `null` e não toca no banco.
- `src/app/admin/actions.test.ts`: ações de admin barram não admins e planos inválidos.
- `src/app/perfil/actions.test.ts`: busca e confirmação de perfil só para quem ainda não travou um @ (nem admin).
- `src/app/conta/actions.test.ts`: exclusão apaga a conta antes de encerrar a sessão; se falhar, o cliente continua logado e vê o erro.
- `src/lib/accounts.db.test.ts`: **integração com PostgreSQL real**: dois clientes travando o mesmo @ (coleta conta uma vez), normalização, termos, `update-user` rejeitando `plan`/`instagramUsername`, exclusão em cascata, estatísticas. Mesmo padrão de `TEST_DATABASE_URL`. Última execução: 2026-10-19, Postgres 17 local descartável, passou.
- `src/lib/settings.test.ts`: estados das integrações (faltando / ok / inválido) e garantia de que nenhum valor de variável aparece no resultado.
- `src/lib/instagram.test.ts` (dados reais com `fetch` mockado): sem banco o gráfico fica vazio (nada estimado), concorrentes reais no mercado, concorrente com erro é ignorado, selos de exemplo corretos.
- `src/lib/instagram.test.ts`: `targetUsernameSchema` aceita usernames válidos e rejeita injeção na expressão `fields`; sem credenciais ou com `INSTAGRAM_BUSINESS_ID` inválido, devolve mock sem chamar `fetch` e sem expor o valor configurado.

Não há testes de componentes, E2E nem testes contra banco ou API real. Entram junto dos fluxos que precisarem (por exemplo, snapshots diários com banco de teste descartável). Mock de `pg` não prova SQL real.

## Revisão após implementação ou correção

Ao concluir um ciclo de implementação ou correção, sugira de 3 a 8 ciclos posteriores de code review, com quantidade proporcional ao risco, focos complementares e prompt de continuação preenchido. É convenção do projeto; revisões adicionais dependem de pedido do usuário.

Cada ciclo verifica o estado atual e o código conectado, registra achados com severidade, local e evidência e reavalia correções autorizadas com os checks afetados. Correções da mesma rodada não reiniciam a contagem.

## Dependências e entrega

- `npm audit --omit=dev` (produção): rode e registre. Última execução em `docs/setup.md`.
- `npm audit` (completo): inclui ferramentas de desenvolvimento; advisories cuja "correção" seria downgrade de major não são aplicados com `--force`.

Lint e build aprovados não significam auditoria zerada. Sem hooks Git, bloqueios de push ou exigências de branch. Atualize este documento junto dos scripts e regras.
