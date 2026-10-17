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
- `src/app/api/instagram/route.test.ts`: `@perfil` vira `perfil`; alvo inválido responde 400 com mensagem pt-BR sem chamar a API.
- `src/lib/instagram.test.ts`: `targetUsernameSchema` aceita usernames válidos e rejeita injeção na expressão `fields`; sem credenciais ou com `INSTAGRAM_BUSINESS_ID` inválido, devolve mock sem chamar `fetch` e sem expor o valor configurado.

Não há testes de componentes, E2E nem testes contra banco ou API real. Entram junto dos fluxos que precisarem (por exemplo, snapshots diários com banco de teste descartável). Mock de `pg` não prova SQL real.

## Revisão após implementação ou correção

Ao concluir um ciclo de implementação ou correção, sugira de 3 a 8 ciclos posteriores de code review, com quantidade proporcional ao risco, focos complementares e prompt de continuação preenchido. É convenção do projeto; revisões adicionais dependem de pedido do usuário.

Cada ciclo verifica o estado atual e o código conectado, registra achados com severidade, local e evidência e reavalia correções autorizadas com os checks afetados. Correções da mesma rodada não reiniciam a contagem.

## Dependências e entrega

- `npm audit --omit=dev` (produção): rode e registre. Última execução em `docs/setup.md`.
- `npm audit` (completo): inclui ferramentas de desenvolvimento; advisories cuja "correção" seria downgrade de major não são aplicados com `--force`.

Lint e build aprovados não significam auditoria zerada. Sem hooks Git, bloqueios de push ou exigências de branch. Atualize este documento junto dos scripts e regras.
