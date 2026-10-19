# Login, contas e painel de admin — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login com Google, perfil do Instagram travado por conta, planos atribuídos pelo admin com acesso por seção, painel de admin, páginas legais e exclusão de conta.

**Architecture:** Better Auth (Google, adaptador Drizzle/PostgreSQL) guarda usuários e sessões no Neon. Um módulo `viewer` lê a sessão a cada request no servidor e decide alvo, plano e redirecionamentos; regras de acesso ficam num módulo puro (`access.ts`). Páginas e a API de dados chamam esses módulos; nada de autorização depende só do cliente.

**Tech Stack:** Next.js 16.4 App Router, React 19, TypeScript strict, Better Auth 1.6.x, Drizzle ORM + `pg`, Zod 4, Pino, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-login-contas-design.md` (leia antes de cada tarefa).

## Global Constraints

- Trabalhar na branch `feature/login-contas` criada a partir de `main`. A alteração não commitada em `src/db/index.ts` pertence a `fix/pg-sslmode`: não incluir nesta branch (deixar com `git stash` ou no seu branch original; perguntar ao dono se em dúvida).
- Segredos só no servidor: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAILS`, `SUPPORT_WHATSAPP`. Nunca `NEXT_PUBLIC_*`, nunca valores no Git; `.env.example` só com nomes e comentários.
- Nenhum e-mail de admin nem número de WhatsApp escrito no código, testes ou docs (testes usam valores fictícios como `admin@example.com`, `61900000000`).
- `src/app` e `src/components` não importam `@/db`; dados por módulos em `src/lib`.
- Arquivos até 350 linhas; textos da interface em pt-BR; 375 px sem rolagem horizontal.
- Migrations: `npm run db:generate`, revisar SQL, `npm run db:migrate` só contra o Neon `nichemap` (autorizado pelo dono; `.env.local` já aponta para ele). Nunca migrar em build/import/request.
- Planos: `basico`, `intermediario`, `completo`; padrão `basico`.
- Aviso de confirmação, texto exato: **"Essa escolha é definitiva. Depois de confirmar, sua conta fica ligada a este perfil e não pode ser trocada por você."**
- Mensagem para cliente sem dados reais, texto exato: **"Dados indisponíveis no momento. Tente novamente mais tarde."**
- Textos legais com o selo visível **"Rascunho: precisa de revisão jurídica"** e lacunas `[NOME DO RESPONSÁVEL]`, `[CPF/CNPJ]`.
- Não ativar o cache de sessão em cookie do Better Auth (`session.cookieCache`): plano, @ e exclusão precisam valer no request seguinte.
- Logs (Pino) sem tokens, cookies, e-mails completos nem corpos de resposta; identificar contas por `userId`.
- Antes de concluir: `npm run check` passa.

## Review Focus

1. **Cliente forjando o alvo** (`?target=outro` na página ou na API): deve ver só o próprio @. Teste na Task 5.
2. **Dois clientes travando o mesmo @ ao mesmo tempo**: um vence, o outro recebe "perfil já em uso". Teste de integração na Task 4.
3. **Cliente alterando o próprio plano ou @ pela API do Better Auth** (`/api/auth/update-user` com `plan: "completo"`): campos extras com `input: false`, ignorados. Teste de integração na Task 4.
4. **E-mail de admin com maiúsculas/espaços** em `ADMIN_EMAILS` ou vindo do Google: comparação normalizada. Teste na Task 1.
5. **@ com maiúsculas ou `@` inicial** ("@BioDev"): trava como `biodev`, e o mesmo perfil digitado de outra forma conta como em uso. Teste na Task 4.

---

### Task 1: Ambiente e configurações

**Files:**
- Modify: `src/lib/env-schema.ts`, `src/lib/env.ts`, `src/lib/settings.ts`, `.env.example`
- Test: `src/lib/env.test.ts`, `src/lib/settings.test.ts`

**Interfaces:**
- Produces (em `src/lib/env.ts`, server-only):
  - `getAuthConfig(): { googleClientId: string; googleClientSecret: string; secret: string; baseURL: string } | null` — `null` se alguma das quatro variáveis faltar; lança `Invalid or missing environment variable: <KEY>` se presente e inválida (`BETTER_AUTH_SECRET` mínimo 32 caracteres; `BETTER_AUTH_URL` URL http/https).
  - `isAdminEmail(email: string | null | undefined): boolean` — compara com `ADMIN_EMAILS` (vírgula), `trim` + minúsculas dos dois lados; vazio/indefinido → `false`.
  - `getSupportWhatsappUrl(): string | null` — só dígitos de `SUPPORT_WHATSAPP`; 10–11 dígitos → prefixa `55`; 12–13 começando com `55` → mantém; outro formato → lança erro de env; vazio → `null`. Retorna `https://wa.me/<digitos>`.

- [ ] **Step 1: Testes que falham** em `env.test.ts`:
  - `isAdminEmail("Admin@Example.com ")` com `ADMIN_EMAILS=" admin@example.com,outro@example.com"` → `true`; `"x@example.com"` → `false`; sem variável → `false`; `isAdminEmail(undefined)` → `false`.
  - `getSupportWhatsappUrl()` com `"(61) 90000-0000"` → `"https://wa.me/5561900000000"`; com `"5561900000000"` → mesmo resultado; com `"123"` → lança com mensagem contendo `SUPPORT_WHATSAPP` e sem `123`.
  - `getAuthConfig()` sem variáveis → `null`; com `BETTER_AUTH_SECRET="curto"` e as demais → lança mencionando `BETTER_AUTH_SECRET`, sem o valor.
- [ ] **Step 2:** `npx vitest run src/lib/env.test.ts` → FAIL (funções não existem).
- [ ] **Step 3:** Implementar as três funções (schemas em `env-schema.ts`, usando `parseEnv`).
- [ ] **Step 4:** Em `settings.ts`, adicionar integrações "Login com Google" (`GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET, BETTER_AUTH_URL`, valida com `getAuthConfig`), "Administradores" (`ADMIN_EMAILS`), "Suporte (WhatsApp)" (`SUPPORT_WHATSAPP`, valida com `getSupportWhatsappUrl`). Estender `settings.test.ts`: nenhum valor aparece no resultado.
- [ ] **Step 5:** Acrescentar as seis variáveis em `.env.example` com comentários (como gerar `BETTER_AUTH_SECRET`: `npx @better-auth/cli secret` ou 32+ caracteres aleatórios; `BETTER_AUTH_URL=http://localhost:3000` em dev).
- [ ] **Step 6:** `npx vitest run src/lib/env.test.ts src/lib/settings.test.ts` → PASS.
- [ ] **Step 7: Commit** `feat: auth, admin and support environment config`

### Task 2: Regras de acesso (módulo puro)

**Files:**
- Create: `src/lib/access.ts`
- Test: `src/lib/access.test.ts`

**Interfaces:**
- Consumes: `SectionHref` de `src/lib/nav.ts`.
- Produces:
  - `export const PLANS = ["basico", "intermediario", "completo"] as const; export type Plan = (typeof PLANS)[number];`
  - `export const PLAN_LABELS: Record<Plan, string>` = `{ basico: "Básico", intermediario: "Intermediário", completo: "Completo" }`
  - `requiredPlan(href: SectionHref): Plan | "admin"` — `/`, `/scanner` → `basico`; `/conteudo`, `/relatorios` → `intermediario`; `/mercado`, `/empresas`, `/oportunidades` → `completo`; `/configuracoes` → `"admin"`.
  - `canAccess(viewer: { plan: Plan; isAdmin: boolean }, href: SectionHref): boolean` — admin acessa tudo; senão plano ≥ exigido (ordem de `PLANS`); `"admin"` só admin.
  - `canSeeCompetitors(viewer): boolean` = `canAccess(viewer, "/mercado")`.
  - `isPlan(value: unknown): value is Plan`.

- [ ] **Step 1: Testes que falham** — tabela completa: para cada `SectionHref` × cada plano (não admin), o resultado esperado da tabela do spec; admin com `basico` acessa `/mercado` e `/configuracoes`; `completo` não admin não acessa `/configuracoes`; `isPlan("premium")` → `false`.
- [ ] **Step 2:** `npx vitest run src/lib/access.test.ts` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5: Commit** `feat: plan access rules`

### Task 3: Better Auth, schema e migration

**Files:**
- Modify: `package.json`, `package-lock.json` (dependência `better-auth`), `src/db/schema/index.ts`
- Create: `src/db/schema/auth.ts`, `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, `drizzle/0001_*.sql`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Consumes: `getDb()` de `@/db`; `getAuthConfig()` (Task 1).
- Produces:
  - `src/lib/auth.ts` (server-only): `getAuth(): Auth | null` — cria uma vez (memo) com `drizzleAdapter(getDb(), { provider: "pg", schema })`, `socialProviders.google`, `user.additionalFields` = `plan` (`string`, `defaultValue: "basico"`, `input: false`), `instagramUsername` (`string`, `required: false`, `input: false`), `termsAcceptedAt` (`date`, `required: false`, `input: false`), `lastSeenAt` (`date`, `required: false`, `input: false`); `databaseHooks.session.create.after` atualiza `user.last_seen_at = now()` ("último acesso" = último login; decisão do plano); `plugins: [nextCookies()]` por último. Retorna `null` se `getAuthConfig()` for `null` ou banco não configurado (`isDatabaseConfigured()`).
  - `src/lib/auth-client.ts` (cliente): `export const authClient = createAuthClient()` de `better-auth/react`.
  - Rota: `GET`/`POST` delegam para `getAuth()?.handler(req)`; sem auth → `503` JSON `{ error: "Login não configurado." }`.
  - Tabelas `user`, `session`, `account`, `verification` (nomes do Better Auth) com colunas extras em `user`: `plan text not null default 'basico'`, `instagram_username text unique` (nulo permitido), `terms_accepted_at timestamptz`, `last_seen_at timestamptz`. FKs de `session` e `account` com `on delete cascade`.

- [ ] **Step 1:** Ver a versão estável: `npm view better-auth version time --json`; usar a mais recente com pelo menos 2 semanas, versão exata em `package.json`. Instalar: `npm install better-auth@<versão>`. Confirmar compatibilidade com Next 16 na doc (Context7 `/better-auth/better-auth`) e registrar fonte e motivo em `docs/setup.md` (Task 9 completa a doc).
- [ ] **Step 2:** Gerar o schema com o CLI (`npx @better-auth/cli generate --config src/lib/auth.ts --output src/db/schema/auth.ts`); se o CLI não conseguir carregar o config (server-only/env), escrever o schema à mão seguindo a doc do adaptador Drizzle. Exportar de `src/db/schema/index.ts`.
- [ ] **Step 3: Teste que falha** em `auth.test.ts` (com `server-only` mockado): sem variáveis de auth, `getAuth()` → `null` e não chama `getDb`; importar o módulo não lê o banco.
- [ ] **Step 4:** Implementar `getAuth`, `auth-client.ts` e a rota. Rodar o teste → PASS.
- [ ] **Step 5:** `npm run db:generate`; revisar `drizzle/0001_*.sql`: só `CREATE TABLE` das quatro tabelas, índice único em `instagram_username`, cascatas; nada tocando `profile_snapshots`.
- [ ] **Step 6:** `npm run db:migrate` (Neon `nichemap`) → "migrations applied successfully".
- [ ] **Step 7:** `npm run typecheck && npm run build` → PASS sem variáveis de auth no ambiente de build.
- [ ] **Step 8: Commit** `feat: Better Auth with Google and auth tables`

### Task 4: Contas e visitante (viewer)

**Files:**
- Create: `src/lib/accounts.ts`, `src/lib/viewer.ts`
- Test: `src/lib/accounts.test.ts`, `src/lib/accounts.db.test.ts`, `src/lib/viewer.test.ts`

**Interfaces:**
- Consumes: `getDb()`, tabela `user` (Task 3), `getAuth()`, `isAdminEmail()`, `Plan`/`isPlan`/`canAccess` (Task 2), `resolveTarget()` de `src/lib/instagram.ts`.
- Produces:
  - `src/lib/accounts.ts` (server-only):
    - `type LockResult = { ok: true } | { ok: false; reason: "in_use" | "already_locked" | "terms_required" }`
    - `lockProfile(userId: string, username: string, acceptedTerms: boolean): Promise<LockResult>` — `username` já normalizado por `resolveTarget`; sem termos → `terms_required`; `UPDATE user SET instagram_username, terms_accepted_at = now() WHERE id = $1 AND instagram_username IS NULL`; 0 linhas → `already_locked`; erro Postgres `23505` → `in_use`.
    - `isUsernameTaken(username: string): Promise<boolean>`
    - `unlockProfile(userId: string): Promise<void>`, `setPlan(userId: string, plan: Plan): Promise<void>` (rejeita plano inválido), `deleteAccount(userId: string): Promise<void>`
    - `listAccounts(): Promise<AccountRow[]>` com `AccountRow = { id; name; email; instagramUsername: string | null; plan: Plan; createdAt: Date; lastSeenAt: Date | null }`, ordem `createdAt desc`
    - `getAccountStats(now?: Date): Promise<{ total: number; byPlan: Record<Plan, number>; newLast7: number; newLast30: number }>`
    - `listLockedUsernames(): Promise<string[]>`
    - `isUniqueViolation(error: unknown): boolean` (exportado para teste)
  - `src/lib/viewer.ts` (server-only):
    - `type Viewer = { userId: string; name: string; email: string; image: string | null; isAdmin: boolean; plan: Plan; instagramUsername: string | null; termsAcceptedAt: Date | null }`
    - `getViewer(): Promise<Viewer | null>` — `getAuth()?.api.getSession({ headers: await headers() })`, lendo `plan`/`instagramUsername` da sessão (vêm do banco a cada request, sem cookie cache); plano inválido no banco → `basico`.
    - `requireViewer(href: SectionHref | "/conta"): Promise<Viewer>` — sem viewer → `redirect("/entrar")`; não admin sem `instagramUsername` → `redirect("/perfil")`; sem acesso (`canAccess`) → `redirect("/plano?secao=" + href)`; `/configuracoes` sem admin → `notFound()`.
    - `requireAdmin(): Promise<Viewer>` — não admin (ou sem login) → `notFound()`.
    - `targetFor(viewer: Viewer, param: string | null | undefined): string | null` — admin: `resolveTarget(param)`; cliente: `viewer.instagramUsername` (ignora `param`).

- [ ] **Step 1: Testes unitários que falham:**
  - `accounts.test.ts`: `isUniqueViolation({ code: "23505" })` → `true`; `{ code: "23503" }` → `false`; também quando o erro vem em `cause` (Drizzle embrulha erros do `pg`).
  - `viewer.test.ts` (mockar `server-only`, `next/headers`, `next/navigation`, `@/lib/auth`): `targetFor` de cliente com `param="outro"` → o @ travado; admin com `"@Outro"` → `"outro"`; `requireViewer("/mercado")` com cliente `basico` → `redirect` chamado com `/plano?secao=/mercado`; sem sessão → `/entrar`; cliente sem @ → `/perfil`; `requireAdmin()` com cliente → `notFound` chamado; admin pela lista `ADMIN_EMAILS` mesmo com plano `basico` acessa `/mercado`.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar `accounts.ts` e `viewer.ts`.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5: Teste de integração** `accounts.db.test.ts`, no mesmo padrão de `src/lib/snapshots.db.test.ts` (só roda com `TEST_DATABASE_URL`, aplica migrations num banco descartável — **não** o Neon de produção; um branch Neon descartável ou Postgres local):
  - dois usuários; `Promise.all([lockProfile(a,"biodev",true), lockProfile(b,"biodev",true)])` → exatamente um `{ok:true}` e um `{ok:false, reason:"in_use"}`.
  - `lockProfile(a, resolveTarget("@BioDev")!, true)` grava `biodev`; segunda chamada para `a` → `already_locked`; sem termos → `terms_required`.
  - `auth.api.updateUser` com corpo `{ plan: "completo", instagramUsername: "x" }` na sessão de um usuário não altera esses campos (Review Focus 3). Se exigir sessão real difícil de montar, chamar o endpoint via `auth.handler` com cookie de sessão criado por `auth.api`/inserção direta; documentar no teste.
  - `deleteAccount(a)` apaga `session`/`account` em cascata e libera o @.
  - `getAccountStats` conta por plano e janelas de 7/30 dias com `now` fixo.
- [ ] **Step 6:** Rodar com `TEST_DATABASE_URL` → PASS; registrar data e banco usado em `docs/quality.md` (Task 9).
- [ ] **Step 7: Commit** `feat: account locking and request viewer`

### Task 5: Dados do painel por visitante

**Files:**
- Modify: `src/lib/instagram.ts`, `src/lib/dashboard.ts`, `src/app/api/instagram/route.ts`, `src/lib/graph.ts`
- Test: `src/lib/instagram.test.ts`, `src/app/api/instagram/route.test.ts`

**Interfaces:**
- Consumes: `getViewer`, `targetFor` (Task 4), `canSeeCompetitors` (Task 2), `listLockedUsernames` (Task 4).
- Produces:
  - `getDashboardData(targetUsername: string, options?: { includeCompetitors?: boolean; mockOnFailure?: boolean }): Promise<DashboardData | null>` — padrões `true`/`true` (comportamento atual). `includeCompetitors: false` → não chama `fetchProfile` para concorrentes nem carrega histórico deles; `market`/`opportunities` vazios e fora de `sampleSections`. `mockOnFailure: false` → sem credenciais ou erro da API retorna `null` (sem dados de exemplo).
  - `loadDashboard(searchParams: PageSearchParams, viewer: Viewer): Promise<DashboardResult>` — alvo via `targetFor`; cliente: `includeCompetitors: canSeeCompetitors(viewer)`, `mockOnFailure: false`, `null` → `{ error: "Dados indisponíveis no momento. Tente novamente mais tarde." }`; admin: comportamento atual.
  - `GET /api/instagram`: sem viewer → `401 { error: "Faça login para continuar." }`; cliente sem @ travado → `403`; alvo via `targetFor`; cliente sem dados → `503` com a mensagem de indisponível.
  - `collectDailySnapshots` inclui `listLockedUsernames()` (sem banco/erro → segue sem eles, `warn` no log).
  - `graph.ts`: `PROFILE_FIELDS` ganha `profile_picture_url`; `RawBusinessDiscovery.profile_picture_url?: string`.

- [ ] **Step 1: Testes que falham:**
  - `instagram.test.ts`: com `includeCompetitors: false` e 2 concorrentes configurados, `fetch` chamado 1 vez e `market` = `[]`; com `mockOnFailure: false` e API respondendo erro → `null`; sem credenciais e `mockOnFailure: false` → `null`.
  - `route.test.ts` (mockar `@/lib/viewer`): sem viewer → 401 e `getDashboardData` não chamado; cliente `basico` com @ `meuperfil` e `?target=outro` → chamado com `("meuperfil", { includeCompetitors: false, mockOnFailure: false })`; cliente com dados `null` → 503 com a mensagem exata; admin com `?target=@biodev` → `("biodev", …)` como hoje; admin com alvo inválido → 400.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar. Ajustar todas as chamadas de `loadDashboard` nas páginas para compilar (a Task 7 completa a proteção; aqui pode receber o viewer de `requireViewer(href)`).
- [ ] **Step 4:** `npx vitest run src/lib/instagram.test.ts src/app/api/instagram/route.test.ts` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat: dashboard data scoped to the signed-in viewer`

### Task 6: Entrada, escolha de perfil, conta e páginas legais

**Files:**
- Create: `src/app/entrar/page.tsx`, `src/components/GoogleSignInButton.tsx`, `src/app/perfil/page.tsx`, `src/app/perfil/actions.ts`, `src/components/ProfileLockForm.tsx`, `src/app/conta/page.tsx`, `src/app/conta/actions.ts`, `src/components/DeleteAccountButton.tsx`, `src/components/SignOutButton.tsx`, `src/app/privacidade/page.tsx`, `src/app/termos/page.tsx`, `src/components/LegalFooter.tsx`, `src/lib/onboarding.ts`
- Test: `src/lib/onboarding.test.ts`

**Interfaces:**
- Consumes: `authClient` (Task 3), `getViewer`/`requireViewer` (Task 4), `lockProfile`/`isUsernameTaken`/`deleteAccount` (Task 4), `fetchProfile`/`getInstagramCredentials`, `getSupportWhatsappUrl` (Task 1), `getAuth()` para saber se login está configurado.
- Produces:
  - `src/lib/onboarding.ts` (server-only):
    - `type ProfilePreview = { username: string; name: string; pictureUrl: string | null; followers: number }`
    - `lookupProfile(raw: string): Promise<{ ok: true; profile: ProfilePreview } | { ok: false; message: string }>` — normaliza com `resolveTarget`; inválido → "Digite um @ válido: letras, números, ponto e sublinhado."; sem credenciais → "Serviço indisponível no momento. Tente mais tarde."; já em uso → "Este perfil já está ligado a outra conta. Fale com o suporte."; erro da Graph API de usuário não encontrado/não comercial → "Não encontramos esse perfil como conta comercial ou de criador. Se a conta for pessoal, mude para profissional nas configurações do Instagram e tente de novo."; outros erros → mensagem de `describeGraphError` existente.
    - `lockMessage(result: LockResult): string` — `in_use` → mesma mensagem de "já está ligado"; `already_locked` → "Sua conta já tem um perfil escolhido."; `terms_required` → "Aceite os termos e a política de privacidade para continuar."
  - Server actions em `src/app/perfil/actions.ts`: `previewProfile(formData)` e `confirmProfile(formData)` (`username`, `terms`); `confirmProfile` repete `lookupProfile` antes de travar e `redirect("/")` no sucesso. Ambas exigem viewer logado (senão `redirect("/entrar")`).
  - Server action em `src/app/conta/actions.ts`: `deleteMyAccount()` → `deleteAccount(viewer.userId)`, encerra a sessão e `redirect("/entrar")`.

- [ ] **Step 1: Testes que falham** em `onboarding.test.ts` (mockar Graph e `isUsernameTaken`): cada mensagem acima para seu caso; `"@BioDev"` busca `biodev`; preview mapeia `profile_picture_url` → `pictureUrl` e `name` ausente → `@username`.
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar `onboarding.ts`. **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Páginas:
  - `/entrar`: pública; se já logado → `/`. Nome, uma frase, `GoogleSignInButton` (`authClient.signIn.social({ provider: "google", callbackURL: "/" })`), `LegalFooter`. Sem `getAuth()` → texto "Login ainda não configurado." sem botão.
  - `/perfil`: exige login; já travado → `/`. `ProfileLockForm` (cliente): campo @ → mostra foto (`<img>` com `alt` = nome; sem foto, iniciais), nome, @, seguidores formatados pt-BR, checkbox de termos com links, botão "Sou eu"; abre diálogo acessível (`<dialog>` com foco, `Esc` fecha) com o aviso exato e botões "Confirmar" / "Voltar". Erros em `role="alert"`. Admin pode ignorar esta etapa (vai direto a `/`).
  - `/conta`: `requireViewer("/conta")`; mostra nome, e-mail, @, plano (`PLAN_LABELS`), link "Falar com o suporte no WhatsApp" (se `getSupportWhatsappUrl()`), `SignOutButton`, `DeleteAccountButton` com diálogo "Excluir sua conta apaga seus dados e libera o perfil. Não dá para desfazer.".
  - `/privacidade` e `/termos`: públicas, selo de rascunho, lacunas do responsável. Privacidade lista exatamente: nome, e-mail e foto da conta Google; @ escolhido; plano; datas de cadastro, aceite dos termos e último acesso; finalidade (login e entrega do painel); dados públicos do Instagram consultados pela API oficial; compartilhamento: Google (login), Neon (banco), Vercel (hospedagem), Meta (consulta de dados públicos); exclusão em `/conta` ou pelo suporte; direitos da LGPD (art. 18). Termos: serviço de análise de dados públicos, planos definidos pelo responsável, perfil travado, uso proibido para perfis de terceiros sem autorização, sem garantia de disponibilidade da API do Instagram.
- [ ] **Step 6:** `npm run typecheck && npm run lint` → PASS.
- [ ] **Step 7: Commit** `feat: sign-in, profile lock, account and legal pages`

### Task 7: Proteção das seções e navegação por plano

**Files:**
- Modify: `src/app/page.tsx`, `src/app/{scanner,conteudo,mercado,empresas,oportunidades,relatorios,configuracoes}/page.tsx`, `src/components/AppShell.tsx`, `src/components/Sidebar.tsx`, `src/components/Header.tsx`, `src/components/DashboardClient.tsx`, `src/lib/nav.ts`
- Create: `src/app/plano/page.tsx`

**Interfaces:**
- Consumes: `requireViewer`, `Viewer` (Task 4), `canAccess`, `requiredPlan`, `PLAN_LABELS` (Task 2), `loadDashboard(searchParams, viewer)` (Task 5), `getSupportWhatsappUrl`.
- Produces:
  - `type NavViewer = { plan: Plan; isAdmin: boolean; name: string }` passado de servidor para `AppShell` → `Sidebar`/`Header` (sem e-mail nem ids no cliente).
  - `AppShell({ target, viewer, children })`.

- [ ] **Step 1:** Cada página chama `const viewer = await requireViewer("<href>")` antes de qualquer dado; `/` usa o alvo de `targetFor(viewer, param)` em vez de `INSTAGRAM_TARGET_USERNAME`/`biodev` para clientes.
- [ ] **Step 2:** `Sidebar`: seções sem acesso aparecem com ícone de cadeado (`Lock` do lucide) e `aria-label` "<Seção> (disponível no plano <Plano>)", link para `/plano?secao=<href>`; `/configuracoes` só aparece para admin; links novos "Minha conta" (`/conta`) para todos e "Admin" (`/admin`) só para admin. Mesmo comportamento no menu do celular.
- [ ] **Step 3:** `Header`: busca de perfil só para admin; para cliente mostra o @ travado em texto.
- [ ] **Step 4:** `DashboardClient` recebe `showCompetitors: boolean`; falso → no lugar de `MarketTable` e `Opportunities`, um cartão "Concorrentes e oportunidades estão no plano Completo" com link para `/plano?secao=/mercado`.
- [ ] **Step 5:** `/plano`: exige login; mostra a seção pedida (`secao` validado contra `SectionHref`, senão genérico), o plano exigido, o plano atual e o link do WhatsApp "Quero mudar de plano".
- [ ] **Step 6:** `AppShell` mostra `LegalFooter` (links para `/privacidade` e `/termos`) no fim de todas as páginas logadas.
- [ ] **Step 7:** `npm run typecheck && npm run lint && npm run build` → PASS.
- [ ] **Step 8: Commit** `feat: plan-gated sections and navigation`

### Task 8: Painel de admin

**Files:**
- Create: `src/app/admin/page.tsx`, `src/app/admin/actions.ts`, `src/components/AdminAccountsTable.tsx`
- Test: `src/app/admin/actions.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` (Task 4), `listAccounts`, `getAccountStats`, `setPlan`, `unlockProfile` (Task 4), `PLANS`, `PLAN_LABELS`, `isPlan` (Task 2).
- Produces: server actions `changePlan(formData: FormData)` (`userId`, `plan`) e `unlockAccountProfile(formData: FormData)` (`userId`); ambas começam com `await requireAdmin()`, validam com Zod (`userId` string não vazia, `plan` em `PLANS`) e chamam `revalidatePath("/admin")`.

- [ ] **Step 1: Testes que falham** em `actions.test.ts` (mockar `@/lib/viewer` e `@/lib/accounts`): não admin → `notFound` e `setPlan` não chamado; admin com `plan="premium"` → rejeita sem chamar `setPlan`; admin válido → `setPlan(userId, "completo")`; `unlockAccountProfile` de não admin não chama `unlockProfile`.
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar ações. **Step 4:** Rodar → PASS.
- [ ] **Step 5:** Página `/admin` (`requireAdmin()` primeiro): cartões com total, contas por plano, novas em 7 e 30 dias; `AdminAccountsTable` com nome, e-mail, @ (ou "não travado"), plano (select + botão "Salvar" com `confirm` de "Mudar o plano de <nome> para <Plano>?"), cadastro e último acesso em pt-BR, botão "Destravar perfil" com confirmação. No celular, a tabela vira lista de cartões (sem rolagem horizontal da página).
- [ ] **Step 6:** `npm run typecheck && npm run lint` → PASS.
- [ ] **Step 7: Commit** `feat: admin dashboard with plan and profile controls`

### Task 9: Documentação, verificação completa e PR

**Files:**
- Modify: `PRODUCT.md`, `docs/architecture.md`, `docs/onboarding.md`, `docs/setup.md`, `docs/quality.md`, `docs/design.md` (se houver novos padrões de UI)

- [ ] **Step 1:** `docs/onboarding.md`, passo a passo para leigo: criar cliente OAuth no Google Cloud (tela de consentimento externa, escopos padrão `openid email profile`, links de `/privacidade` e `/termos`, URI de redirecionamento `http://localhost:3000/api/auth/callback/google` e `https://<domínio>/api/auth/callback/google`), gerar `BETTER_AUTH_SECRET`, preencher `.env.local` e as variáveis na Vercel (incluindo `DATABASE_URL` do Neon), definir `ADMIN_EMAILS` e `SUPPORT_WHATSAPP`.
- [ ] **Step 2:** `PRODUCT.md`: login, planos e admin saem de "fora de escopo"; tabela de planos; pendências (cobrança, IA de concorrentes, revisão jurídica). `docs/architecture.md`: novos módulos, fluxo de autorização, tabelas, decisão Better Auth (fonte e data), risco do limite da Graph API com muitos clientes. `docs/setup.md`: versão do Better Auth e fonte. `docs/quality.md`: novos testes e a execução do teste de integração.
- [ ] **Step 3:** `npm run check` → tudo PASS.
- [ ] **Step 4:** Verificar no navegador em `npm run dev` (localhost) com as variáveis de teste: `/` sem login → `/entrar`; `/privacidade` e `/termos` abrem sem login; `/admin` sem login → 404; a 375 px, `/entrar`, `/perfil`, `/conta`, `/admin` sem rolagem horizontal. Login real com Google só se o dono já tiver criado o cliente OAuth; caso contrário, registrar como não verificado.
- [ ] **Step 5: Commit** `docs: login, plans and admin` e abrir PR para `main` seguindo `CONTRIBUTING.md` (com autorização do dono para push/PR).
