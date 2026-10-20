# Teste de fonte não oficial do Instagram (Apify) — design

Data: 2026-10-19. Terceiro dos projetos para vender o Nichemap (ver `2026-10-18-login-contas-design.md`).

## Intenção

A API oficial (`business_discovery`) só devolve contas **comerciais ou de criador**. Muitos clientes em potencial têm conta **pessoal pública** e hoje nem conseguem travar o perfil. O dono quer testar uma fonte não oficial para atender essas pessoas, aceitando que ela pode quebrar a qualquer momento. Se quebrar, ele desliga a fonte ou a mantém só para algumas contas. Por isso o teste precisa ser **desligável**, **restrito a contas escolhidas** e **identificado na tela**.

Perfis **privados** (com cadeado) continuam fora: nenhuma fonte os mostra sem seguir a conta, e isso não será feito.

## Decisão de fonte (aprovada pelo dono em 2026-10-19)

Opções comparadas (preços lidos nas páginas dos fornecedores em 2026-10-19):

| | Apify `apify/instagram-profile-scraper` | HikerAPI | Biblioteca de API privada (`instagrapi`) |
|---|---|---|---|
| Custo | Plano Free com US$ 5/mês de crédito, sem cartão, US$ 2,60 por 1.000 perfis (~1.900/mês). Starter: US$ 19/mês | Pré-pago, ~US$ 1 por 1.000 chamadas, 100 grátis | US$ 0 de API, mas exige um serviço Python à parte |
| Banimento | Nenhuma conta nossa envolvida | Nenhuma conta nossa | Alto: exige login com uma conta do Instagram |
| Termos da Meta | Coleta automatizada contra os termos. O risco recai principalmente no fornecedor | Igual, com um fornecedor menor | Violação direta, feita por nós |
| LGPD | Dados públicos de pessoa física continuam sendo dados pessoais | Igual | Igual, e ainda há senha do Instagram para guardar |

**Escolha do dono: Apify, plano Free, custo US$ 0.** Não subir de plano nem ativar cobrança sem nova aprovação do dono. Quem cria a conta na Apify e gera o token é o dono (passo a passo em `docs/onboarding.md`).

## Objetivos

1. **Chave geral.** `UNOFFICIAL_SOURCE_ENABLED=true` e `APIFY_TOKEN` (somente no servidor, nunca em `NEXT_PUBLIC_*`). Sem os dois, o app se comporta exatamente como hoje e nenhuma chamada à Apify acontece.
2. **Liberação por conta.** Nova coluna `user.unofficial_source boolean not null default false`. No `/admin`, cada conta ganha um controle "Fonte não oficial" (liga/desliga) via server action que chama `requireAdmin()`, como `changePlan`. Toda conta começa desligada.
3. **Só como plano B.** Em toda busca de perfil, a API oficial é tentada primeiro. A Apify é usada **somente** quando:
   - a chave geral está ligada, e
   - quem está vendo é um admin, ou uma conta com `unofficial_source = true` olhando o próprio @ travado, e
   - a API oficial recusou o perfil por não ser comercial/criador ou por não encontrá-lo. Os demais erros (token expirado, limite, Meta fora do ar) **não** caem para a Apify.
4. **Travar o perfil.** A tela "Qual é o seu perfil?" usa a mesma regra. Se o admin liberou a conta antes do travamento, uma conta pessoal pública consegue confirmar o @ com dados da Apify. Perfil privado: mensagem clara de que perfis privados não funcionam.
5. **Aviso na tela.** `DashboardData.source` ganha o valor `"unofficial"`. O `DataSourceBanner` mostra, em cor de alerta e diferente de "Dados reais" e de "Dados de exemplo": **"Fonte não oficial — pode falhar ou ficar desatualizada"**, seguido da nota. Relatórios impressos/PDF mostram o mesmo aviso. A tela de travamento indica que os dados exibidos vêm de fonte não oficial.
6. **Coleta diária.** `collectDailySnapshots` aplica a mesma regra aos perfis travados de contas liberadas: um perfil por dia. Os snapshots seguem na mesma tabela. Opcional para o builder: guardar a origem numa coluna `source` em `profile_snapshots`.
7. **Economia de crédito.** Resultado da Apify em cache por perfil durante **6 horas** (minha decisão; o builder escolhe o mecanismo de cache do Next 16 conforme `node_modules/next/dist/docs/`). Uma busca por perfil por chamada: nunca listar seguidores, comentários etc.
8. **Falhas.** Crédito esgotado, Apify fora do ar, timeout ou resposta inesperada: cliente vê "Dados indisponíveis no momento", como hoje, e o admin recebe o fallback de exemplo com o motivo na nota. O log Pino registra o erro sem token e sem corpo completo. Timeout curto (~60 s, o actor roda de forma síncrona).

9. **Fonte desligada depois de usada (decisão do dono).** Se a chave geral for desligada, ou a conta deixar de ser liberada, e a API oficial recusar o perfil travado como não comercial, o cliente vê uma mensagem própria em vez de "Dados indisponíveis": **"A fonte não oficial foi desativada. Para continuar, mude sua conta do Instagram para profissional (comercial ou criador)."** Para isso, `getDashboardData`/`loadDashboard` precisam distinguir esse motivo de uma falha genérica. Nada é destravado automaticamente.
10. **Termos e privacidade (decisão do dono).** Atualizar agora `/termos` e `/privacidade`, que ainda são rascunho à espera de revisão jurídica. Os textos passam a dizer que, para contas liberadas pelo admin, os dados públicos do perfil podem vir de um fornecedor terceiro (Apify), não oficial, que pode falhar. A Apify entra na lista de terceiros da privacidade. **Sem novo aceite** para quem já aceitou.

## Fora de escopo e o que não fazer

- Nada de biblioteca de API privada, login no Instagram ou perfis privados.
- Não usar a Apify para concorrentes do Market Radar nem para `?target=` de clientes.
- Não subir de plano na Apify, não cadastrar cartão e não criar a conta Apify em nome do dono.
- Não esconder a origem: dado da Apify nunca aparece como "Dados reais do Instagram".

## Integração (referência para o builder)

- Chamada: `POST https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items` com `Authorization: Bearer <APIFY_TOKEN>` e corpo `{"usernames": ["<@ validado>"]}`. Confirmar os nomes dos campos com uma chamada real ou com a documentação do actor antes de mapear. Campos esperados: `username`, `fullName`, `biography`, `followersCount`, `postsCount`, `private`, `latestPosts[]` com `type`, `caption`, `likesCount`, `commentsCount`, `timestamp`, `url`, `id`.
- Novo módulo `src/lib/apify.ts` (server-only) que converte a resposta para `RawBusinessDiscovery`. Assim `getDashboardData` reaproveita o cálculo de KPIs, temas e conteúdos. Tipos de post: `Video`→Reel, `Sidecar`→Carrossel, demais→Imagem. Validar a resposta com Zod. `private: true` vira erro específico.
- Detectar a recusa por "não é comercial/não encontrado" reaproveitando a regra que já existe em `src/lib/onboarding.ts` (`NOT_FOUND_CODE`, código 100). A regra passa a ficar num único lugar, compartilhado pelas duas telas, e tem teste. Como 100 é o código genérico de "parâmetro inválido", `GraphRequestError` passa a guardar também o `error_subcode`. Com um token válido, o builder confirma numa chamada real a um perfil pessoal e restringe a regra ao subcode observado. Sem token, fica só o código 100 e o caso é registrado como pendência em `docs/setup.md` (minha decisão).
- Variáveis em `src/lib/env-schema.ts` / `src/lib/env.ts` com Zod. Atualizar `.env.example` se existir.
- Migration Drizzle gerada com `npm run db:generate` e revisada. Não aplicar sem destino autorizado.
- Limitações a mostrar ou documentar: últimos 12 posts (não 25); sem visualizações.

## Testes e aceite

- Unitários (Vitest), com `fetch` mockado: mapeamento da resposta Apify; perfil privado; regra de decisão (chave desligada, conta não liberada, admin, erro oficial que não é recusa → sem Apify); cache não chama duas vezes; falha da Apify → indisponível para cliente.
- Action do admin: sem admin é recusada; com admin grava o valor.
- Banner: `source: "unofficial"` mostra o texto de fonte não oficial.
- `npm run check` verde. Implementação em branch própria `feature/fonte-nao-oficial`, com PR.
- Documentos: `PRODUCT.md` (requisito "somente API oficial" passa a ter a exceção do teste; tirar "Teste de API não oficial" de fora de escopo), `docs/setup.md` (fonte, motivo e preço consultado), `docs/onboarding.md` (criar conta Apify Free, gerar token, ligar a chave e as contas), `docs/architecture.md`, termos/privacidade (ver objetivo 10).
- Teste extra: fonte desligada com perfil pessoal travado → mensagem de fonte desativada, não "indisponível".

## Decisões minhas (o dono pode mudar)

- Cache de 6 horas.
- O admin também pode usar a fonte para qualquer @ quando a chave está ligada.
- A tela de travamento usa a Apify para contas já liberadas. Sem isso, conta pessoal não consegue travar o perfil.
- Erros da API oficial que não indicam "conta não comercial" não caem para a Apify, para não gastar crédito quando o problema é nosso token.
