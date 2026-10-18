# Nichemap

[![CI](https://github.com/gabrielrichardy/nichemap/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielrichardy/nichemap/actions/workflows/ci.yml)
![Licença](https://img.shields.io/badge/license-proprietário-red)

Painel web mobile-first para social media de empresas e pessoas acompanharem um perfil do Instagram: indicadores, conteúdos em destaque, temas, mercado e oportunidades. Escopo em [PRODUCT.md](PRODUCT.md).

No ar: **https://nichemap-app.vercel.app** (o endereço antigo `niche-intelligence-six.vercel.app` continua funcionando).

> **Status:** MVP funcional. Sem configuração roda com **dados de exemplo**; com um token da Instagram Graph API mostra dados reais do perfil analisado.

## Executar

Requer Node.js 24+ e npm.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Para analisar outro perfil, use a busca do topo ou `?target=@perfil` na URL.

Para dados reais do Instagram e para o banco, copie `.env.example` para `.env.local` e siga [docs/onboarding.md](docs/onboarding.md). Nenhum valor real vai para o Git.

Verificar tudo (lint, tipos, regras, testes e build — sem credenciais):

```bash
npm run check
```

## Deploy na Vercel

O projeto está ligado à Vercel pelo GitHub: cada push na `main` gera o deploy de produção, cada PR ganha um preview. O build usa `npm run build` (Next.js detectado automaticamente).

Variáveis em **Settings > Environment Variables** (todas opcionais; sem elas o deploy funciona com dados de exemplo): `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ID`, `INSTAGRAM_TARGET_USERNAME`, `INSTAGRAM_COMPETITORS`, `META_VERIFICATION_CODE`, `DATABASE_URL` e `CRON_SECRET`. A coleta diária roda pelo Vercel Cron (`vercel.json`, 11:00 UTC = 08:00 em Brasília).

O passo a passo para liberar o acesso real na Meta (app em Live, verificações, permissões e token) está em [docs/onboarding.md](docs/onboarding.md#confirmar-o-app-meta).

## O que é real e o que é exemplo

Com o token configurado, são reais: seguidores, publicações, tipos de conteúdo, conteúdos em destaque e temas (descobertos automaticamente a partir das legendas e hashtags, sem lista fixa). Com `INSTAGRAM_COMPETITORS`, o Market Radar mostra concorrentes reais. Com banco (`DATABASE_URL`) e a coleta diária (`CRON_SECRET` + Vercel Cron), o crescimento é **real**, a partir do segundo dia; antes disso o gráfico diz que o histórico está em construção. Com concorrentes configurados, Oportunidades ranqueia esses perfis pelo engajamento real; sem eles, mostra **dados de exemplo** com o selo “Exemplo”. A seção Pessoas fica oculta até existir uma fonte de dados (#4).

## Documentação

- [Produto e escopo](PRODUCT.md)
- [Preparação local e Meta](docs/onboarding.md)
- [Estrutura e decisões técnicas](docs/architecture.md)
- [Design e acessibilidade](docs/design.md)
- [Checks de qualidade](docs/quality.md)
- [Instruções para agentes](AGENTS.md)
- [Setup e evidências](docs/setup.md)
- [Como contribuir](CONTRIBUTING.md)

## Desenvolvimento

A `main` é protegida: toda mudança entra por Pull Request e só faz merge com os checks de CI `lint` (lint, tipos, regras e testes) e `build` verdes. Branches `feature/`, `fix/`, `docs/`, `chore/`; commits em [Conventional Commits](https://www.conventionalcommits.org/). Detalhes em [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

Backlog nas [Issues do GitHub](https://github.com/gabrielrichardy/nichemap/issues).

| # | Issue | Escopo |
| - | ----- | ------ |
| 1 | [Conectar dados reais do Instagram (token long-lived)](https://github.com/gabrielrichardy/nichemap/issues/1) | `src/lib/instagram.ts` |
| 2 | [Ativar módulo "Conteúdo" na sidebar](https://github.com/gabrielrichardy/nichemap/issues/2) | `src/components/Sidebar.tsx` |
| 3 | [Market Radar com dados reais](https://github.com/gabrielrichardy/nichemap/issues/3) | `mockData.market` |
| 4 | [Pessoas Relevantes + enriquecimento](https://github.com/gabrielrichardy/nichemap/issues/4) | seção oculta até haver fonte |
| 5 | [Oportunidades com scoring real](https://github.com/gabrielrichardy/nichemap/issues/5) | `mockData.opportunities` |
| 6 | [Busca funcional no Header](https://github.com/gabrielrichardy/nichemap/issues/6) | `src/components/Header.tsx` (busca por perfil já entregue) |
| 7 | [Adicionar testes automatizados (Vitest)](https://github.com/gabrielrichardy/nichemap/issues/7) | Vitest + CI |
| 8 | [Histórico de crescimento real (snapshots diários)](https://github.com/gabrielrichardy/nichemap/issues/8) | PostgreSQL + `getDashboardData` |
| 15–21 | Páginas das seções: [Profile Scanner](https://github.com/gabrielrichardy/nichemap/issues/15), [Market Radar](https://github.com/gabrielrichardy/nichemap/issues/16), [Pessoas](https://github.com/gabrielrichardy/nichemap/issues/17), [Empresas](https://github.com/gabrielrichardy/nichemap/issues/18), [Oportunidades](https://github.com/gabrielrichardy/nichemap/issues/19), [Relatórios](https://github.com/gabrielrichardy/nichemap/issues/20), [Configurações](https://github.com/gabrielrichardy/nichemap/issues/21) | `src/app/*/page.tsx` |
| 22 | [Navegação no celular e links "Ver todos"](https://github.com/gabrielrichardy/nichemap/issues/22) | `Sidebar`, cards |
| 23 | [Controles ainda sem ação](https://github.com/gabrielrichardy/nichemap/issues/23) | período, notificações, menu do usuário |

**Próxima entrega:** #8, snapshot diário do perfil no PostgreSQL, para trocar o crescimento estimado por histórico real. Pendências externas: banco autorizado e forma de disparar a coleta diária.
