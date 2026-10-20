# Fonte não oficial (Apify) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fall back to the Apify Instagram Profile Scraper for public personal profiles, but only when a global env flag is on and the account is enabled by the admin, with the data labeled as an unofficial source.

**Architecture:** A new `src/lib/apify.ts` maps Apify output to the existing `RawBusinessDiscovery` type. A new `src/lib/profile-source.ts` decides official vs. unofficial (`fetchProfileWithFallback`). `getDashboardData`, `lookupProfile` and `collectDailySnapshots` call it instead of `fetchProfile`. The per-account flag is a new `user.unofficial_source` column, exposed on `Viewer` and toggled in `/admin`.

**Tech Stack:** Next.js 16.4, React 19.2, TypeScript strict, Drizzle + pg, Zod 4, Pino, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-fonte-nao-oficial-design.md`

## Global Constraints

- Env vars: `UNOFFICIAL_SOURCE_ENABLED` (on only when exactly `"true"`) and `APIFY_TOKEN`, server-only, never `NEXT_PUBLIC_*`. Missing either means the feature is off and Apify is never called.
- Apify endpoint: `POST https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items`, header `Authorization: Bearer <APIFY_TOKEN>`, body `{"usernames":["<validated @>"]}`. Never put the token in the URL or in logs.
- Banner copy: `Fonte não oficial — pode falhar ou ficar desatualizada`.
- Disabled-source copy (customers): `Não conseguimos ler seu perfil como conta profissional e a fonte não oficial está desativada para sua conta. Para continuar, mude sua conta do Instagram para profissional (comercial ou criador).`
- Private-profile copy: `Perfis privados não funcionam. Deixe o perfil público no Instagram e tente de novo.`
- Cache Apify results for 6 hours (21600 s) per username.
- Only the official "not business / not found" refusal (`isNotBusinessError`) may fall back. Every other Graph error propagates unchanged.
- Never use Apify for competitors, and never let a customer use it for a `?target=` other than their locked @ (already guaranteed by `targetFor`).
- UI copy in pt-BR. Files stay at or under 350 lines (`quality/max-lines`). `src/app` and `src/components` never import `@/db`.
- Work in `.wt/fonte` on branch `feature/fonte-nao-oficial`. Commit per task. Run `npm run db:generate` but never `db:migrate`.

## Review Focus

1. Apify returns an empty array (unknown @) → treated as "not found", not a crash. Test in Task 2.
2. Apify returns non-JSON or a 402/429 when credit runs out → customers get `unavailable`, admins get the mock with the reason. Test in Task 2 (error thrown) and Task 4 (mapping to failure).
3. Graph error code 100 that is **not** a business refusal (for example a bad field) → still falls back, because we only know code 100. Accepted risk, recorded as pending in `docs/setup.md` (Task 7) until a real call confirms the subcode.
4. Flag on, account enabled, Apify works, then admin disables the account → next view shows the disabled-source message, and the cache must not keep serving Apify data. The decision runs before the cache. Test in Task 3.
5. An `@` with uppercase letters or a leading `@` → already normalized by `resolveTarget` before reaching Apify. Task 2 test asserts the exact body sent.

---

### Task 1: Env flag, schema column, Viewer field

**Files:**
- Modify: `src/lib/env-schema.ts`, `src/lib/env.ts`, `src/lib/env.test.ts`
- Modify: `src/db/schema/auth.ts` (user table), `src/lib/auth.ts` (additionalFields)
- Create: `drizzle/0002_*.sql` (generated)
- Modify: `src/lib/viewer.ts`, `src/lib/viewer.test.ts`

**Interfaces:**
- Produces: `getApifyToken(): string | null` (null unless the flag is `"true"` and the token is set). `Viewer.unofficialSource: boolean`. `user.unofficialSource` column `unofficial_source boolean not null default false`.

- [ ] **Step 1: Failing tests** in `env.test.ts`: `getApifyToken` returns `null` with no vars; returns `null` with token but flag `"1"` or `"false"`; returns the trimmed token with flag `"true"`. In `viewer.test.ts`: session user with `unofficialSource: true` → `viewer.unofficialSource === true`; missing → `false`.
- [ ] **Step 2: Run** `npx vitest run src/lib/env.test.ts src/lib/viewer.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add `apifyTokenSchema = z.string().min(1)` in `env-schema.ts` and `getApifyToken()` in `env.ts`. Add the column to `user` in `src/db/schema/auth.ts`. Add `unofficialSource: { type: "boolean", required: false, defaultValue: false, input: false }` to `additionalFields`. Read it in `getViewer` (`u.unofficialSource === true`).
- [ ] **Step 4: Run** the tests again (PASS), then `npm run db:generate`. Review the SQL: it should contain only `ALTER TABLE "user" ADD COLUMN "unofficial_source" boolean DEFAULT false NOT NULL`.
- [ ] **Step 5: Commit** `feat: unofficial source env flag and per-account column`.

### Task 2: Apify client and Graph refusal detection

**Files:**
- Create: `src/lib/apify.ts`, `src/lib/apify.test.ts`
- Modify: `src/lib/graph.ts` (`GraphRequestError.subcode`, `isNotBusinessError`), `src/lib/graph.test.ts`

**Interfaces:**
- Consumes: `getApifyToken()` (Task 1).
- Produces:
  - `class PrivateProfileError extends Error`, `class ProfileNotFoundError extends Error`
  - `fetchApifyProfile(username: string, token: string): Promise<RawBusinessDiscovery>`, the uncached call
  - `getApifyProfile(username: string): Promise<RawBusinessDiscovery>`, cached 6 h, reads the token, and throws if the feature is off
  - `isNotBusinessError(err: unknown): boolean` in `graph.ts` (code 100 for now)
  - `GraphRequestError` constructor `(message, code?, subcode?)`; `graphGet` passes `json.error?.error_subcode`

- [ ] **Step 1: Failing tests** in `apify.test.ts`, with `fetch` stubbed via `vi.stubGlobal`:
  - Sends POST to the exact endpoint with header `Authorization: Bearer tok` and body `{"usernames":["pessoal"]}`. No `token=` in the URL.
  - Maps `{username:"pessoal", fullName:"Ana", biography:"bio", profilePicUrl:"p.jpg", followersCount:1200, postsCount:40, private:false, latestPosts:[{id:"1", type:"Video", caption:"c", likesCount:10, commentsCount:2, timestamp:"2026-10-01T00:00:00.000Z", url:"https://instagram.com/p/x"}, {id:"2", type:"Sidecar", ...}, {id:"3", type:"Image", ...}]}` to `RawBusinessDiscovery` with `media_type` `VIDEO`/`CAROUSEL_ALBUM`/`IMAGE`, `like_count`, `comments_count`, `permalink` = `url`, `followers_count:1200`, `media_count:40`, `profile_picture_url:"p.jpg"`.
  - `private:true` → rejects with `PrivateProfileError`.
  - `[]` → rejects with `ProfileNotFoundError`.
  - Status 402 → rejects with an `Error` whose message contains `402` and not the token.
  - Malformed body (`[{foo:1}]`) → rejects (Zod).
  - In `graph.test.ts`: `isNotBusinessError(new GraphRequestError("x", 100))` is true; code 190 → false; a plain `Error` → false; the subcode is kept.
- [ ] **Step 2: Run** `npx vitest run src/lib/apify.test.ts src/lib/graph.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use a Zod schema for the item, with optional fields defaulting like `RawMedia`. Set a 60 s timeout with `AbortSignal.timeout(60_000)`. For the cache, read `node_modules/next/dist/docs/` for the Next 16.4 data-cache API. Use `unstable_cache(fn, ["apify-profile"], { revalidate: 21600 })` if it is still supported; otherwise use the documented `"use cache"` + `cacheLife` path, without enabling a config that changes the other pages' behavior. Errors must not be cached. Log failures with `logger.warn({ target, status })` only. Update `src/lib/onboarding.ts` to use `isNotBusinessError` instead of its local `NOT_FOUND_CODE`. Behavior stays the same, and the existing `onboarding.test.ts` stays green.
- [ ] **Step 4: Run** the tests plus `npx vitest run src/lib/onboarding.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: Apify profile client and Graph business refusal check`.

### Task 3: Source decision

**Files:**
- Create: `src/lib/profile-source.ts`, `src/lib/profile-source.test.ts`

**Interfaces:**
- Consumes: `fetchProfile`, `isNotBusinessError` (graph.ts), `getApifyProfile`, `getApifyToken`.
- Produces:
  - `type ProfileSource = "live" | "unofficial"`
  - `class SourceDisabledError extends Error`: official refused as not business, and unofficial not allowed (flag off or account not enabled)
  - `fetchProfileWithFallback(username: string, credentials: GraphCredentials, opts: { allowUnofficial: boolean; withMedia?: boolean }): Promise<{ profile: RawBusinessDiscovery; source: ProfileSource }>`

- [ ] **Step 1: Failing tests** (mock `./graph` `fetchProfile` and `./apify` `getApifyProfile`, stub env):
  - Official succeeds → `source:"live"`, Apify not called.
  - Official throws code 100, `allowUnofficial:true`, flag on → `source:"unofficial"` with the Apify profile.
  - Official throws code 100, `allowUnofficial:false` → `SourceDisabledError`, Apify not called.
  - Official throws code 100, `allowUnofficial:true`, flag off → `SourceDisabledError`, Apify not called.
  - Official throws code 190 → rethrows that `GraphRequestError`, Apify not called.
  - Apify throws → the error propagates.
- [ ] **Step 2: Run** `npx vitest run src/lib/profile-source.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `fetchProfileWithFallback` in `profile-source.ts`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: official-first profile source with gated unofficial fallback`.

### Task 4: Dashboard, API route and banner

**Files:**
- Modify: `src/lib/types.ts` (`DashboardData.source: "live" | "mock" | "unofficial"`)
- Modify: `src/lib/instagram.ts`, `src/lib/instagram.test.ts`
- Modify: `src/lib/dashboard.ts`, `src/app/api/instagram/route.ts`, `src/app/api/instagram/route.test.ts`
- Modify: `src/components/DataSourceBanner.tsx`; Create `src/components/DataSourceBanner.test.tsx` only if the repo already renders components in Vitest (check `vitest.config.mts`). Otherwise, test the label through a small exported pure helper `sourceLabel(source)` in the same file.

**Interfaces:**
- Consumes: `fetchProfileWithFallback`, `SourceDisabledError` (Task 3); `Viewer.unofficialSource` (Task 1).
- Produces:
  - `DashboardOptions.allowUnofficial?: boolean` (default `false`)
  - `type DashboardFailure = { failure: "unavailable" | "not_business" }`. With `mockOnFailure:false`, `getDashboardData` returns `DashboardData | DashboardFailure` and no longer returns `null`.
  - `NOT_BUSINESS_MESSAGE` exported from `dashboard.ts` (the disabled-source copy)
  - `dashboardOptionsFor(viewer)` adds `allowUnofficial: viewer.isAdmin || viewer.unofficialSource`

- [ ] **Step 1: Failing tests.**
  - `instagram.test.ts`: official refuses with code 100, `allowUnofficial:true`, flag on, Apify mocked → `source:"unofficial"` and a note starting `Perfil e últimos posts vêm de uma fonte não oficial`; same with `allowUnofficial:false, mockOnFailure:false` → `{failure:"not_business"}`; other error with `mockOnFailure:false` → `{failure:"unavailable"}`. Update the existing `toBeNull()` cases to `{failure:"unavailable"}`.
  - `route.test.ts`: `{failure:"not_business"}` → 503 with `NOT_BUSINESS_MESSAGE`; `{failure:"unavailable"}` → 503 with `UNAVAILABLE_MESSAGE`. Update the expected options to include `allowUnofficial`.
  - Banner: `source:"unofficial"` → `Fonte não oficial — pode falhar ou ficar desatualizada`.
- [ ] **Step 2: Run** `npx vitest run src/lib/instagram.test.ts src/app/api/instagram/route.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `getDashboardData`, call `fetchProfileWithFallback(target, credentials, { allowUnofficial })` for the main profile only; competitors keep calling `fetchProfile`. `buildNote` takes the source. For unofficial data the note reads: `Perfil e últimos posts vêm de uma fonte não oficial (Apify).` followed by the history sentence. In `catch`, map `SourceDisabledError` to `not_business` and everything else to `unavailable` (with the mock path unchanged for admins). In `loadDashboard`, map each failure to its message. The banner gets a third style (orange: `bg-orange-50 text-orange-800`). If `instagram.ts` goes over 350 lines, move `collectDailySnapshots` and `lockedOrNone` into `src/lib/collect.ts`, and update the imports in the cron route and tests.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: label unofficial data and explain a disabled source`.

### Task 5: Profile lock and daily collection

**Files:**
- Modify: `src/lib/onboarding.ts`, `src/lib/onboarding.test.ts`, `src/app/perfil/actions.ts`, `src/app/perfil/actions.test.ts`, `src/components/ProfileLockForm.tsx`
- Modify: `src/lib/accounts.ts` (`listUnofficialUsernames`), `src/lib/instagram.ts` (or `collect.ts`), `src/lib/instagram.test.ts`

**Interfaces:**
- Consumes: `fetchProfileWithFallback`, `PrivateProfileError`, `ProfileNotFoundError`.
- Produces:
  - `lookupProfile(raw: string, opts?: { allowUnofficial?: boolean }): Promise<LookupResult>`
  - `ProfilePreview.source: ProfileSource`
  - `listUnofficialUsernames(): Promise<string[]>`: locked @s of accounts with `unofficial_source = true`

- [ ] **Step 1: Failing tests.**
  - `onboarding.test.ts`: code 100 + `allowUnofficial:true` + flag on → `ok:true` with `source:"unofficial"`; Apify `PrivateProfileError` → the private-profile message; Apify `ProfileNotFoundError` → the existing "não encontramos" message; code 100 without permission → the existing message (unchanged).
  - `actions.test.ts`: `previewProfile` and `confirmProfile` call `lookupProfile(x, { allowUnofficial: viewer.unofficialSource })`.
  - `instagram.test.ts` (`collectDailySnapshots`): with locked `["cliente","pessoal"]` and unofficial `["pessoal"]`, `pessoal` is fetched with `allowUnofficial:true` and `cliente`, competitors and the default target with `false`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Map errors in `lookupProfile`: `SourceDisabledError` → the existing not-business message; `PrivateProfileError` → the private copy; `ProfileNotFoundError` → the not-found message; others → `UNAVAILABLE`. When `preview.source === "unofficial"`, `ProfileLockForm` shows below the follower count `<p className="text-xs text-orange-700">Dados de fonte não oficial</p>`. The collection job reads `listUnofficialUsernames()` through the same `isDatabaseConfigured` / try-catch guard as `lockedOrNone`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: unofficial source for profile lock and daily snapshots`.

### Task 6: Admin toggle

**Files:**
- Modify: `src/lib/accounts.ts` (`setUnofficialSource`, `AccountRow.unofficialSource`, `listAccounts`), `src/lib/accounts.db.test.ts` if it covers `listAccounts`
- Modify: `src/app/admin/actions.ts`, `src/app/admin/actions.test.ts`, `src/app/admin/page.tsx`, `src/components/AdminAccountsTable.tsx`

**Interfaces:**
- Produces: `setUnofficialSource(userId: string, enabled: boolean): Promise<void>`; server action `toggleUnofficialSource(formData)` with fields `userId` and `enabled` (`"true"` or `"false"`); `AdminAccount.unofficialSource: boolean`.

- [ ] **Step 1: Failing tests** in `actions.test.ts`, following the existing `changePlan` tests: non-admin → rejected and `setUnofficialSource` not called; admin with `enabled="true"` → `setUnofficialSource("u1", true)` and `revalidatePath("/admin")`; `enabled="maybe"` → throws (Zod `z.enum(["true","false"])`).
- [ ] **Step 2: Run** `npx vitest run src/app/admin/actions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Each card gets a form with a button `Fonte não oficial: ligada` / `Fonte não oficial: desligada` (`aria-pressed`), which submits the opposite value. Above the list, `page.tsx` shows one line: `Fonte não oficial (chave geral): ligada` or `desligada — nenhuma conta usa a Apify`, from `getApifyToken() !== null`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: admin toggle for the unofficial source per account`.

### Task 7: Terms, privacy, docs, full check, PR

**Files:**
- Modify: `src/app/termos/page.tsx` (around line 37), `src/app/privacidade/page.tsx` (lines 29 and 47)
- Modify: `PRODUCT.md`, `docs/setup.md`, `docs/onboarding.md`, `docs/architecture.md`, `.env.example` (if present)

- [ ] **Step 1: Copy.**
  - Terms: after the official-API sentence, add `Para contas liberadas pelo administrador, os dados públicos do perfil podem vir de um fornecedor terceiro não oficial (Apify), que pode falhar, ficar desatualizado ou ser desativado sem aviso.`
  - Privacy: same idea in the data paragraph. Add the list item `Apify: consulta dos dados públicos do perfil, só para contas liberadas pelo administrador.`
- [ ] **Step 2: Docs.**
  - `PRODUCT.md`: add the trial exception to the requirement "somente via API oficial", remove the trial from "Fora de escopo" and add a row to "Hipóteses e pendências" (Graph code 100 not yet confirmed with a real call).
  - `docs/setup.md`: source, reason and price checked on 2026-10-19 (Free US$ 5/month credit, US$ 2.60/1k), plus the code-100 pending item.
  - `docs/onboarding.md`: plain pt-BR steps to create an Apify Free account (no card), copy the API token from Settings → Integrations, set `APIFY_TOKEN` and `UNOFFICIAL_SOURCE_ENABLED=true` on Vercel, apply the migration, and enable accounts in `/admin`. Warn not to upgrade the plan.
  - `docs/architecture.md`: the new modules and the decision flow.
- [ ] **Step 3: Run** `npm run check`. Expected: lint, types, local rules, tests and build all green.
- [ ] **Step 4: Commit** `docs: unofficial source trial setup, terms and privacy`, then push the branch and open a PR to `main`. The body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
