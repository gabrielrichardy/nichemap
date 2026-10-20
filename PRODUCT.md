# Nichemap

Antigo nome do protótipo e do repositório: **Niche Intelligence** (`niche-intelligence`). Renomeado para Nichemap em 2026-10-17, a pedido do usuário.

## Problema e objetivo

Quem cuida das redes sociais de uma empresa (ou da própria marca pessoal) precisa entender como o perfil no Instagram está indo, que conteúdo funciona, como o nicho se movimenta e onde há oportunidades. Hoje isso é feito olhando o app do Instagram e planilhas soltas, sem uma visão consolidada.

O Nichemap reúne essas informações num painel único, pensado para ser consultado principalmente no celular: perfil, indicadores, conteúdos em destaque, temas, mercado e oportunidades.

## Público e papéis

- **Social media de empresas** e **pessoas que gerenciam a própria presença** e querem acompanhar tudo pelo celular.
- **Cliente**: entra com o Google, trava um único perfil do Instagram (escolha definitiva) e vê só esse perfil, conforme o plano. Várias contas podem travar o mesmo @ (decisão do dono, 2026-10-19), por exemplo a equipe de uma marca.
- **Admin** (e-mails em `ADMIN_EMAILS`): vê todas as contas em `/admin`, muda planos, destrava perfis e analisa qualquer perfil.

| Seção | Básico | Intermediário | Completo |
|---|---|---|---|
| Dashboard (perfil, KPIs, profile score, destaques, crescimento, tipos, temas) | sim | sim | sim |
| Profile Scanner | sim | sim | sim |
| Conteúdo, Relatórios | não | sim | sim |
| Market Radar, Empresas, Oportunidades (e o bloco de mercado do Dashboard) | não | não | sim |

Toda conta nova começa no Básico; o plano muda só pelo admin (sem cobrança automática por enquanto). Seções fora do plano aparecem com cadeado e levam a `/plano`. Spec: `docs/superpowers/specs/2026-10-18-login-contas-design.md`.

## Fluxos da versão inicial

1. **Ver o painel de um perfil.** Entrada: perfil buscado no topo da página (`?target=`, aceita `@perfil`) ou o padrão `INSTAGRAM_TARGET_USERNAME`. Ação: abrir `/`. Resultado: cabeçalho do perfil, KPIs (seguidores, engajamento médio, publicações, profile score), gráfico de crescimento, tipos de conteúdo e temas.
2. **Identificar o conteúdo que performa.** Resultado: lista dos 5 conteúdos com mais curtidas, com tipo, data, curtidas, comentários, multiplicador sobre a média e link para o post.
3. **Navegar pelas seções** (menu lateral no desktop, menu horizontal no celular), mantendo o perfil buscado: Profile Scanner, Conteúdo (até 25 publicações recentes), Market Radar, Empresas, Oportunidades, Relatórios (impressão/PDF) e Configurações (estado das integrações, sem mostrar valores).
4. **Saber se o dado é real.** O painel mostra um aviso indicando se os dados vêm da API do Instagram ou são de exemplo.

## MVP

Em ordem de prioridade:

1. Painel do perfil com dados reais da Instagram Graph API (business discovery) e fallback para dados de exemplo. **Implementado.**
2. Leitura confortável no celular (mobile-first). **Implementado:** 375 px sem rolagem horizontal e menu de seções no celular.
3. Histórico real de crescimento a partir de snapshots diários guardados no PostgreSQL. **Implementado no código** (coleta diária + tabela); em produção falta criar o banco e o `CRON_SECRET`.
4. Mercado e Oportunidades com fonte real: **implementados** via concorrentes (`INSTAGRAM_COMPETITORS`); Oportunidades = concorrentes ranqueados por engajamento (score = engajamento × 10, máx. 100). Pessoas relevantes: **oculta** até haver fonte (#4).
5. Temas descobertos automaticamente nas legendas e hashtags do perfil (termos presentes em mais publicações), sem lista fixa de nicho. Leitura por IA (LLM) seria uma evolução com custo de API; não implementada.

## Fora de escopo (por enquanto)

- Cobrança automática dos planos e notificações. Controles ainda sem ação estão na issue #23.
- IA que encontra e lê concorrentes automaticamente (projeto separado; exige API paga a aprovar).
- App nativo: o produto é web mobile-first (decisão do usuário, 2026-10-17). React Native/Expo não entra.

## Requisitos

- Interface em português (pt-BR).
- Funcionar no celular sem rolagem horizontal; desktop também suportado (sidebar a partir de `md`).
- Dados do Instagram somente via API oficial (Graph API) com conta comercial/criador **pública** como alvo. Exceção de teste: para contas liberadas pelo admin (`user.unofficial_source`), quando a Graph recusa o @ como não comercial, o perfil público pode vir da Apify (fonte não oficial, plano Free, chave `UNOFFICIAL_SOURCE_ENABLED` + `APIFY_TOKEN`). O painel mostra o aviso "Fonte não oficial". Nunca para concorrentes nem para `?target=` de clientes.
- O token do Instagram fica só no servidor (`.env.local`), nunca em `NEXT_PUBLIC_*` nem no cliente.
- O parâmetro `target` é validado (formato de username do Instagram) antes de chamar a API.
- Quando o dado não é real (mock ou estimado), a interface precisa dizer isso.

## Restrições e decisões técnicas

- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, Recharts e lucide-react — stack herdada do protótipo e preservada.
- Gerenciador: **npm** (o protótipo já tinha `package-lock.json`). Node ≥ 24.
- Persistência: Drizzle ORM + PostgreSQL (`pg`), instalado no bootstrap e ainda **sem tabelas**. Justificativa concreta: snapshots diários de seguidores/engajamento para histórico real.
- Instagram Graph API `v25.0`, endpoint `business_discovery`. O token do Graph API Explorer expira em ~1 h; produção precisa de long-lived ou System User e do app Meta aprovado (ver `docs/onboarding.md`).
- Código no GitHub (`gabrielrichardy/nichemap`), `main` protegida por PR + CI; deploy na Vercel a partir da `main`.

## Hipóteses e pendências

| Item | Tipo | Impacto | Próximo passo |
|---|---|---|---|
| Fonte de dados para Pessoas | Decisão externa pendente | Seção oculta | Escolher fonte de enriquecimento de pessoas e custos (#4) |
| Concorrentes do Market Radar | Pendente com o usuário | Mercado e Oportunidades com dados de exemplo | Definir `INSTAGRAM_COMPETITORS` |
| Renovação do token (long-lived / System User) | Decisão externa pendente | Dados reais param quando o token expira | Definir app Meta e fluxo de renovação |
| Banco PostgreSQL de desenvolvimento/produção | Decisão externa pendente | Sem ele não há snapshots | Escolher provedor e criar `.env.local` com `DATABASE_URL` |
| Concorrentes iguais para todos os clientes do plano Completo | Limitação conhecida | Cliente de outro nicho vê a mesma lista | Projeto da IA de concorrentes |
| Textos de privacidade e termos | Rascunho | Precisam de revisão jurídica e dos dados do responsável | Preencher `[NOME DO RESPONSÁVEL]` e `[CPF/CNPJ]` e revisar |
| Cliente OAuth do Google | Pendente com o dono | Sem ele ninguém entra | Seguir `docs/onboarding.md` (Login com Google) |
| Código 100 como recusa de "não comercial" (Graph) | Pendente de chamada real | A regra de fallback usa só o código 100, que também é "parâmetro inválido" genérico; sem teste real, não se sabe se perfil pessoal cai certo na Apify | Chamar a Graph com um perfil pessoal público (token válido) e restringir a regra ao `error_subcode` observado |
| Fonte não oficial (Apify, plano Free) | Decisão do dono (2026-10-19) | Fornecedor pode falhar, mudar preço ou sair; crédito US$ 5/mês | Acompanhar consumo no painel da Apify; não subir de plano sem nova aprovação |

## Critérios de aceitação

Produto:

- Sem variáveis do Instagram, `/` mostra o painel com dados de exemplo e o aviso "Dados de exemplo".
- Com `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_BUSINESS_ID` válidos, KPIs, tipos de conteúdo, temas e conteúdos em destaque vêm da API e o aviso indica "Dados reais do Instagram".
- Se a API falhar, o painel continua com dados de exemplo e mostra o motivo.
- `GET /api/instagram?target=<inválido>` responde 400 sem chamar a API.
- A 375px de largura, o painel não tem rolagem horizontal.

Os checks técnicos ficam em [docs/quality.md](docs/quality.md).

## Próxima entrega

**Snapshot diário do perfil no PostgreSQL**: primeira tabela Drizzle (perfil, data, seguidores, publicações, engajamento), gravação idempotente por dia e gráfico de crescimento lendo o histórico real quando existir — mantendo o aviso de estimativa enquanto não houver dias suficientes. Depende de um `DATABASE_URL` autorizado e de como disparar a coleta diária (decisão a tomar).

## Manutenção

Atualize este documento quando objetivo, escopo, restrições ou critérios de aceitação mudarem. Decisões técnicas e evidências detalhadas ficam em [docs/architecture.md](docs/architecture.md) e [docs/setup.md](docs/setup.md).
