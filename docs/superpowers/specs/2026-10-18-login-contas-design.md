# Login, contas e painel de admin — design

Data: 2026-10-18. Primeiro de três projetos para vender o Nichemap:

1. **Este:** login, perfil travado por conta, planos atribuídos manualmente e painel de admin.
2. Depois: cobrança automática dos planos.
3. Depois: teste de API não oficial do Instagram, restrita a alguns usuários e desligável.

## Intenção

O dono do Nichemap quer vender o painel em planos. Hoje qualquer pessoa abre o site e analisa qualquer perfil por `?target=`. Para vender, cada cliente precisa de uma conta, ver só o próprio perfil e ter acesso conforme o plano. O dono precisa enxergar quem usa o site e controlar planos manualmente, para vender por Pix/transferência antes de existir cobrança automática.

O dono não conhece banco de dados: tudo o que exigir ação dele (criar banco, criar credenciais do Google, configurar variáveis) precisa estar explicado passo a passo em `docs/onboarding.md`, em português simples.

## Objetivos

### Entrada

- Login **somente com Google** ("Entrar com Google"). O site não guarda senha.
- Todas as páginas do painel e as rotas de API de dados exigem login. Ficam públicas só a página de entrada simples, `/privacidade` e `/termos`. A página de entrada é simples (nome do produto, uma frase do que faz, botão "Entrar com Google"). A rota do cron continua protegida pelo `CRON_SECRET`, como hoje.

### Primeiro acesso: travar o perfil

1. Depois do primeiro login, a conta sem perfil travado é levada para uma tela "Qual é o seu perfil?" e não acessa o painel até concluir.
2. O cliente digita o @ (aceita `@`, mesma validação de `targetUsernameSchema`).
3. O site busca o perfil pela API oficial (`business_discovery`) e mostra **foto, nome, @ e seguidores**.
4. O cliente confirma "Sou eu". Antes de gravar, um diálogo de confirmação avisa em destaque: **"Essa escolha é definitiva. Depois de confirmar, sua conta fica ligada a este perfil e não pode ser trocada por você."** Botões: confirmar / voltar.
5. Se o perfil não for encontrado (conta pessoal, privada, @ inexistente, API fora), explicar o motivo em linguagem simples — conta pessoal: "Só funciona com conta comercial ou de criador; mude nas configurações do Instagram e tente de novo" — e deixar tentar de novo. Nada é gravado até a confirmação.
6. Um mesmo @ pode ser travado por **uma conta só**. Se outra conta já travou aquele @, a tela diz que o perfil já está em uso e orienta a falar com o suporte (link de WhatsApp do suporte).
7. Sem token do Instagram configurado (modo exemplo), a etapa não pode confirmar perfis: mostra que o serviço está indisponível. Não inventar dados de perfil.

### Uso do painel pelo cliente

- O cliente vê **sempre e só** o perfil travado. A busca de perfil do topo (`Header`) some para clientes, e `?target=` é ignorado no servidor para eles (não basta esconder no cliente: a rota `/api/instagram` e `loadDashboard` precisam usar o perfil da sessão).
- Para clientes, quando os dados reais falharem (token ausente/expirado, limite da API), mostrar um estado "Dados indisponíveis no momento, tente mais tarde" em vez do painel de exemplo com o @ dele. O fallback para dados de exemplo continua só para o admin.
- Depois que o admin destrava o @, o cliente volta para a tela "Qual é o seu perfil?" no próximo acesso.
- Os perfis travados entram na coleta diária de snapshots (`collectDailySnapshots`), para que cada cliente tenha histórico de crescimento real.

### Planos

- Três planos guardados na conta: `basico`, `intermediario`, `completo`. Toda conta nova começa no **básico**.
- O plano muda só pelo admin, no painel de admin. Sem cobrança neste projeto.
- Acesso por plano (aplicado no servidor, em páginas e APIs; menu mostra o que o plano não inclui como bloqueado com "Disponível no plano X", não escondido):

| Seção | Básico | Intermediário | Completo |
|---|---|---|---|
| Dashboard: perfil, KPIs, profile score, conteúdo em destaque, crescimento, tipos de conteúdo e temas | sim | sim | sim |
| Bloco de mercado dentro do Dashboard | não (bloqueado) | não (bloqueado) | sim |
| Profile Scanner | sim | sim | sim |
| Conteúdo | não | sim | sim |
| Relatórios | não | sim | sim |
| Market Radar, Empresas, Oportunidades | não | não | sim |

- "Sugestões de conteúdo" fazem parte do plano completo, mas ainda não existem; não entram neste projeto.
- Para o básico, os dados de concorrentes não devem nem ser buscados (economiza chamadas da API), não só escondidos.

### Painel de admin

- Admin = conta cujo e-mail do Google está em `ADMIN_EMAILS` (variável só do servidor, lista separada por vírgula). Nenhum e-mail escrito no código.
- Página `/admin`, invisível e bloqueada (404 ou redirecionamento) para quem não é admin, inclusive acesso direto pela URL e pelas APIs.
- Mostra: total de contas, contas por plano, contas que entraram nos últimos 7 e 30 dias, e uma tabela com nome, e-mail, @ travado (ou "não travado"), plano, data de cadastro e último acesso.
- Ações do admin: **mudar plano** e **destravar o @** de uma conta (para suporte: @ errado, troca de @). Ambas pedem confirmação.
- O admin continua podendo buscar qualquer perfil pelo `Header`, como hoje, e acessa todas as seções.

### Segurança ("não vazar nada")

- Segredos novos (credenciais OAuth do Google, segredo de sessão, `ADMIN_EMAILS`) só no servidor, em `.env.local`/Vercel; nunca `NEXT_PUBLIC_*`, nunca no repositório. `.env.example` lista só os nomes.
- Um cliente nunca recebe dados de outro cliente: toda consulta por conta filtra pelo usuário da sessão no servidor.
- Logs (Pino) não registram tokens, cookies, e-mails completos nem corpos de resposta.
- `Configurações` passa a ser só do admin (mostra estado das integrações do servidor, que é informação do dono).
- Testes cobrindo: cliente sem login é barrado; cliente não vê `?target` de outro perfil; cliente básico não acessa página/API do completo; não admin não acessa `/admin` nem as ações; @ não pode ser travado por duas contas.

## Não objetivos

- Cobrança, checkout, Pix automático, nota fiscal (projeto 2).
- API não oficial (projeto 3).
- Login por e-mail e senha, outros provedores, equipes/agências com vários perfis por conta.
- Verificação de posse do perfil (código na bio). Fica como evolução se alguém travar o @ de outra pessoa.
- Sugestões de conteúdo.
- Cache das chamadas da Graph API (ver riscos).

## Anti-objetivos (falhou mesmo que funcione)

- Qualquer segredo ou e-mail de admin no código ou no Git.
- Cliente conseguindo ver outro perfil ou outra conta mexendo na URL.
- Bloqueio de plano só visual (escondido no menu, mas acessível pela URL ou API).
- Pedir senha ou acesso à conta do Instagram do cliente.
- Dados de exemplo aparecendo para um cliente como se fossem reais do perfil dele.

## Restrições

- Stack atual (Next 16.4 App Router, React 19, Drizzle + PostgreSQL, Zod, Pino, Vitest). Seguir `AGENTS.md`: consultar documentação atual antes de escolher a biblioteca de login e registrar fonte e motivo em `docs/setup.md`/`docs/architecture.md`.
- Banco: tabelas novas via schema Drizzle em `src/db/schema/`, SQL gerado com `npm run db:generate` e revisado. Nunca migrar no build/import/request; `db:migrate` só contra banco autorizado pelo dono.
- `src/app` e `src/components` não importam `@/db`.
- Arquivos até 350 linhas; textos da interface em pt-BR; mobile-first (375 px sem rolagem horizontal).
- Hoje o login depende de banco: sem `DATABASE_URL` o site não tem como funcionar com contas. Comportamento sem banco: página de entrada mostra que o serviço não está configurado (sem crash).

## Decisões do dono

- Login com Google.
- Cliente digita o @, o site mostra a foto, o cliente confirma, e o @ fica travado com aviso de escolha única.
- Admin vê quem usa e quantos usam.
- Todos começam no básico; o dono muda o plano manualmente.
- Básico: perfil, conteúdo de destaque, profile score e o básico. Completo: concorrentes e sugestões de conteúdo.

## Calls do designer (não confirmados pelo dono)

- Admin pode destravar o @ de um cliente.
- Um @ só pode estar travado em uma conta.
- Seções bloqueadas aparecem no menu com cadeado, para incentivar upgrade.
- `ADMIN_EMAILS` em variável de ambiente.
- Configurações vira página só de admin.
- Clientes veem "dados indisponíveis" em vez de dados de exemplo quando a API falha.
- Básico inclui crescimento, tipos de conteúdo e temas do próprio perfil (são "o básico" do perfil); só o que envolve concorrentes fica no completo.

## Fica para o builder

- Biblioteca de autenticação (Auth.js ou Better Auth, por exemplo), desde que suporte Google, Next 16 App Router e Drizzle/PostgreSQL. Verificar compatibilidade na documentação atual.
- Formato das tabelas, sessão em banco ou JWT, nomes de rotas além de `/admin`.
- Visual das telas, seguindo `docs/design.md`.

## Riscos conhecidos

- **Limite da Graph API.** Todas as visitas de todos os clientes usam o token do dono. Com muitos clientes o limite de chamadas da Meta pode estourar. Fora de escopo agora; registrar em `docs/architecture.md`.
- **Concorrentes globais.** Lista única até o projeto da IA de concorrentes.

## Respostas do dono (2026-10-18)

- **Concorrentes:** o dono quer uma IA que encontre e leia os concorrentes automaticamente. Isso é um projeto separado (exige API paga de IA/busca, com custo a aprovar). **Neste projeto** a lista continua única, em `INSTAGRAM_COMPETITORS`, igual para todos os clientes do plano completo.
- **Privacidade (urgente, entra neste projeto):** páginas públicas `/privacidade` e `/termos`, com link na página de entrada e no rodapé; checkbox "Li e aceito os termos e a política de privacidade" no primeiro acesso, guardando data do aceite; botão "Excluir minha conta" em uma página de conta do cliente, com confirmação, que apaga os dados pessoais da conta (o @ fica livre). O texto é um rascunho marcado como **"precisa de revisão jurídica"** e lista só os dados que o site realmente guarda (nome, e-mail e foto do Google, @ travado, plano, datas de cadastro, aceite e último acesso). Campos de identificação do responsável (nome/CNPJ ou CPF) ficam como lacunas visíveis para o dono preencher.
- **Plano intermediário:** básico + Conteúdo + Relatórios, como na tabela.
- **Banco:** PostgreSQL no **Supabase**, que já está conectado à conta do dono (custo informado: US$ 0/mês). Conexão pelo pooler, via `DATABASE_URL`.
- **Suporte:** WhatsApp. O número fica na variável de servidor `SUPPORT_WHATSAPP`, fora do código; a interface monta o link `wa.me` a partir dela.
