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

Em produção, as mesmas variáveis ficam na Vercel (Settings > Environment Variables).

### Dados reais do Instagram

1. No Graph API Explorer (https://developers.facebook.com/tools/explorer/), gere um token com `instagram_business_basic`, `pages_show_list` e `business_management`.
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

Hoje o schema está vazio, então não há migration a aplicar.

## Verificar

```bash
npm run check
```

Roda lint, typecheck, self-check das regras, testes e build. Nada disso precisa de credenciais nem conecta ao banco. Esperado: tudo verde.

## Agentes

Leia [AGENTS.md](../AGENTS.md). [CLAUDE.md](../CLAUDE.md) importa as mesmas instruções. Ao abrir o projeto no Claude Code, aprove o servidor MCP `context7` (`.mcp.json`) e os plugins Ponytail e Caveman declarados em `.claude/settings.json`. No Codex, confie no projeto para carregar `.codex/config.toml`. Detalhes em [setup.md](setup.md).

## Dificuldades conhecidas

- **Aviso "Next.js ignored package-lock.json in C:\Users\…"**: causado por um `package-lock.json` num diretório pai. Corrigido fixando `turbopack.root` em `next.config.ts`.
