<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Nichemap

## Produto e stack

- Produto e escopo: `PRODUCT.md`.
- Stack: Next.js 16.4 (App Router, Turbopack), React 19.2, TypeScript 5 strict, Tailwind 4, Recharts, lucide-react, Drizzle ORM + `pg`, Zod 4, Pino, Vitest. Node ≥ 24, npm.
- Setup e validações: `docs/setup.md`.

## Comandos canônicos

- Instalar: `npm install`
- Desenvolver: `npm run dev`
- Lint: `npm run lint`
- Tipos: `npm run typecheck`
- Regras locais de lint: `npm run lint:rules`
- Testes: `npm test` (um arquivo: `npx vitest run <caminho>`)
- Build: `npm run build`
- Verificar base: `npm run check`
- SQL: `npm run db:generate` (sem conexão); `npm run db:migrate` só em destino autorizado.

## Acordos de trabalho

- Leia código e instruções pertinentes antes de editar. Declare hipóteses que alterem comportamento ou escopo.
- Complete o pedido com a menor mudança suficiente. Reutilize padrões, componentes e dependências existentes.
- Preserve alterações locais, validação, tratamento de erros, segurança, acessibilidade e requisitos explícitos.
- Não crie abstrações, arquitetura, opções, dependências ou funcionalidades para necessidades não solicitadas.
- Execute checks adequados. Teste lógica relevante e regressões; mudanças triviais não precisam de testes que apenas reproduzem a implementação.
- Não transforme hipóteses em fatos ou integrações pendentes em resultados simulados. Dado mock ou estimado precisa aparecer como tal na interface.
- Continue trabalho já autorizado. Pergunte somente por informação indispensável ou por ação fora da autorização.
- Publicação, mensagens a terceiros, custos e ações destrutivas dependem de autorização pertinente. Instalar ferramentas não concede essa autorização.

## Continuidade de execução

- Durante trabalho autorizado, responda a perguntas de status e retome as ações restantes. Pare se o usuário pedir pausa, cancelar ou mudar o objetivo.
- Um bloqueio impede só tarefas dependentes. Conclua as independentes que ainda forem seguras e autorizadas.
- Se um agente falhar ou ficar com estado incerto, confirme que parou antes de assumir seus arquivos e retome do ponto verificado.
- Não repita tentativa idêntica sem evidência nova. Respeite limites de custo, tempo e tentativas.
- Ao retomar por handoff, confira arquivos, Git, checks e processos reais. Só afirme execução em segundo plano quando houver processo verificável.

## Padrões do projeto

- Persistência: Drizzle + PostgreSQL. Schema em `src/db/schema/`, SQL em `drizzle/`, conexão única em `src/db/index.ts` (`getDb()`, pool lazy com `max: 5`). Gere e revise SQL antes de aplicar; não migre no build, import ou request.
- Valide entradas e ambiente com Zod (`src/lib/env-schema.ts`, `targetUsernameSchema` em `src/lib/instagram.ts`). Use o logger Pino (`src/lib/logger.ts`) no servidor, sem tokens nem corpos completos.
- `src/app` e `src/components` não importam `@/db`: chame módulos de funcionalidade em `src/lib` (regra `quality/no-direct-data-access`).
- Segredos (`INSTAGRAM_ACCESS_TOKEN`, `DATABASE_URL`) só no servidor e em `.env.local`; nunca em `NEXT_PUBLIC_*`.
- Consulte fontes oficiais atuais e o canal estável antes de alterar stack/APIs; registre fonte e motivo em `docs/setup.md`. Não migre versões principais automaticamente.
- `PRODUCT.md` guarda escopo; `docs/architecture.md`, estrutura; `docs/design.md`, interface; `docs/onboarding.md`, preparação; `docs/quality.md`, checks. Atualize o documento responsável junto da mudança.

## Ferramentas e estilo

- **Ponytail:** intensidade `full` para programação. `stop ponytail` desativa.
- **Caveman:** conversa concisa no idioma do usuário (pt-BR), sem perder clareza. Código, documentação e commits com redação normal. `stop caveman` desativa.
- **Superpowers:** skills pertinentes, fluxo proporcional ao escopo. Execução já autorizada prevalece sobre aprovações repetidas.
- **Context7:** documentação atual de APIs e bibliotecas, um conceito por consulta, sem segredos ou código privado. Se indisponível, use fontes oficiais e registre.
- **RTK:** use comandos suportados; com hook ativo, evite wrapper duplicado. `rtk proxy <comando>` para saída original.
- **Graphify:** use o grafo quando ajudar em perguntas de estrutura; registre se estiver desatualizado. Não invente relações.
- **LLMs:** preserve cliente, modelo principal e autenticação da sessão. Subagentes usam o modelo mais leve capaz do aceite; não troque provedor nem ative API paga ou proxy.

O estado real de cada ferramenta (instalada, pendente ou ausente) está em `docs/setup.md`. Uma preferência escrita aqui não instala o plugin.

## Skills locais

Instaladas em `.agents/skills/` (cópias em `.claude/skills/`), origem em `skills-lock.json`:

- `vercel-react-best-practices`: ao escrever/revisar React/Next, dados e desempenho.
- `vercel-composition-patterns`: em decisões concretas de composição de componentes.
- `web-design-guidelines`: revisão de interface e acessibilidade (inclusive mobile).
- `writing-guidelines`: revisão de documentação e prosa.
- `vercel-react-view-transitions`: transições solicitadas.
- `vercel-optimize`: otimização com métricas Vercel disponíveis.
- `deploy-to-vercel`: publicação/preview autorizados.
- `vercel-cli-with-tokens`: operações Vercel com token, se esse método for escolhido.
- `find-skills`: descoberta quando faltar uma capacidade concreta.

Instalar skills não executa suas ações. Não force animações, cache, deploy ou mudanças de arquitetura só porque uma skill existe.

## Git e colaboração

- A `main` no GitHub já é protegida (PR + checks `lint` e `build` da CI, revisão via CODEOWNERS): trabalhe em branch e abra PR, conforme `CONTRIBUTING.md`. Não acrescente hooks `pre-commit`/`pre-push`.
- Lint, tipos, testes e build são checks explícitos (`npm run check`).
- Tarefas paralelas precisam de arquivos distintos. Um escritor por arquivo; lockfile e configuração compartilhada ficam com o coordenador.

## Delegação e revisão

- Delegue só quando isolamento de contexto, especialização ou paralelismo independente compensarem. Busca e mudanças mecânicas: capacidade leve. Segurança, dados, migrations e revisão crítica: capacidade suficiente.
- Cada tarefa recebe objetivo, arquivos permitidos, aceite e checks. Verifique diff e checks antes de aceitar o resultado.
- Após cada ciclo de implementação ou correção, sugira ao usuário de **3 a 8 ciclos de code review**, com quantidade e focos conforme risco, e um prompt copiável com os checks reais. É convenção do projeto, não garantia; a sugestão não dispara rodadas automaticamente.

## Convenções

- Imports com alias `@/*` → `src/*`.
- Componentes de UI em `src/components/` (PascalCase, um por arquivo); tipos compartilhados em `src/lib/types.ts`.
- Textos da interface em pt-BR. Arquivos até 350 linhas (`quality/max-lines`).
