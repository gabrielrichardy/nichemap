# Cobrança automática dos planos — design

Data: 2026-10-19. Segundo de três projetos para vender o Nichemap (o primeiro, login/contas/planos/admin, está em `2026-10-18-login-contas-design.md`).

**Status: aprovado pelo dono em 2026-10-19.** O dono pediu para não passar pelas perguntas ("pode por tudo") e depois respondeu às perguntas-chave (ver "Respostas do dono"). As decisões marcadas como **[decisão do Claude]** foram tomadas sem ele e precisam ser conferidas na leitura.

## Intenção

Hoje o cliente paga por Pix fora do site, avisa no WhatsApp e o dono muda o plano à mão em `/admin`. Isso não escala e depende do dono lembrar de rebaixar quem parou de pagar. O objetivo é que o cliente assine sozinho, pague por Pix, cartão ou boleto, tenha o plano liberado assim que o pagamento cair, e perca o plano sozinho se parar de pagar ou cancelar — sem o dono precisar mexer em nada no dia a dia.

O dono não é técnico: tudo o que exigir ação dele (criar conta no provedor, chaves, webhook, nota fiscal) vai passo a passo em `docs/onboarding.md`, em português simples.

## Provedor: Asaas (confirmado pelo dono)

Comparação feita em 2026-10-19 nas páginas oficiais (taxas padrão; podem mudar):

| | Asaas | Stripe (conta Brasil) | Mercado Pago |
|---|---|---|---|
| Cartão em assinatura | 1,99% + R$ 0,49 (promo 3 meses), depois 2,99% + R$ 0,49 | 3,99% + R$ 0,39 **+ 0,7% do Billing** | 4,98% (na hora) a 3,98% (30 dias) |
| Pix | R$ 0,99 (promo 3 meses), depois R$ 1,99 por Pix recebido | só pagamento avulso; **Pix Automático não disponível para conta Brasil** | 0,99% |
| Boleto | R$ 0,99 (promo), depois R$ 1,99 | R$ 3,45 | R$ 3,49 |
| Pix Automático (Pix recorrente autorizado uma vez) | sim | não (conta BR) | não confirmado |
| Nota fiscal de serviço automática | sim, R$ 0,49 por nota, emitida a cada pagamento da assinatura | não | não |
| Mensalidade | não | não | não |

Exemplo, plano de R$ 59,90 no cartão: Asaas ≈ R$ 2,28; Stripe ≈ R$ 3,20; Mercado Pago ≈ R$ 2,38 a R$ 2,98.

Motivos da escolha: mais barato nos três meios, Pix Automático, nota fiscal automática sem integração extra, ambiente de teste (sandbox) e página de pagamento hospedada pelo Asaas (o site nunca vê dados de cartão). Fontes: `asaas.com/precos-e-taxas`, `docs.asaas.com` (Pix Automático, Assinaturas, Webhooks), `stripe.com/br/pricing`, `docs.stripe.com/payments/pix`, `mercadopago.com.br/ajuda/33399`.

## Objetivos

### Preços (confirmados pelo dono)

| Plano | Mensal | Anual (2 meses grátis) |
|---|---|---|
| Básico | grátis | — |
| Intermediário | R$ 59,90 | R$ 599,00 |
| Completo | R$ 99,90 | R$ 999,00 |

- **Básico continua gratuito** e é o plano de toda conta nova, como hoje (confirmado pelo dono). Só Intermediário e Completo são pagos.
- Valores ficam numa constante no código (`src/lib/billing-plans.ts`); mudar preço = PR. Assinaturas existentes mantêm o preço contratado.
- Sem período de teste grátis.

### Assinar

1. `/plano` vira a página de planos: três cartões (Básico/Intermediário/Completo) com o que cada um inclui (mesma tabela do `PRODUCT.md`), seletor **Mensal / Anual** e botão "Assinar" nos pagos. Continua mostrando o plano atual e, se a pessoa veio de uma seção bloqueada (`?secao=`), qual plano libera aquela seção.
2. Ao clicar "Assinar", um formulário pede **CPF ou CNPJ** (exigido pelo Asaas para cobrar e emitir nota) e, opcional, celular para o Asaas avisar sobre cobranças. Nome e e-mail vêm da conta Google.
3. O servidor cria (ou reutiliza) o cliente no Asaas e a assinatura, com `externalReference` = id do usuário, e redireciona para a página da primeira cobrança no Asaas, onde a pessoa escolhe **Pix, cartão ou boleto**.
4. Ao voltar, `/conta` mostra "Aguardando pagamento" até o webhook confirmar. Pix e cartão confirmam em segundos; boleto, em até 3 dias úteis.
5. Pagamento confirmado → o plano muda na hora (próximo carregamento de página, como já funciona com `setPlan`).

O CPF/CNPJ **não** é guardado no banco do Nichemap; fica só no Asaas. O banco guarda só os ids do Asaas.

Como o cartão é cobrado nos meses seguintes e se o Pix vira Pix Automático depende de como o Asaas trata assinatura com meio "escolhido pelo cliente" — ver "Deixado para quem construir".

### Mudar de plano **[decisão do Claude]**

Só com a assinatura **ativa** (não vale em "aguardando pagamento", "pagamento pendente" nem cancelada).

- **Subir no mensal** (Intermediário → Completo): o plano muda na hora; a assinatura no Asaas passa para o novo valor a partir da próxima cobrança. Sem cobrança proporcional do mês corrente (o cliente ganha a diferença até o próximo vencimento — no máximo R$ 40, muito mais simples).
- **Subir no anual**: fica agendado para a renovação (o anual não ganha meses de graça no plano maior). Quem quiser antes, cancela e assina de novo.
- **Descer** (Completo → Intermediário): vale a partir do próximo ciclo; até lá continua no Completo.
- **Trocar mensal ↔ anual** (com ou sem troca de plano): não há troca direta nesta versão. A pessoa cancela e assina de novo; se ainda está no período pago, a nova assinatura tem o primeiro vencimento no fim desse período, e a primeira cobrança chega por e-mail com link para pagar (vale a regra normal de atraso).

### Cancelar

- Em `/conta`, botão "Cancelar assinatura" com confirmação. A assinatura é cancelada no Asaas (nada mais é cobrado) e o cliente **mantém o plano até o fim do período já pago**; depois volta ao Básico.
- **Direito de arrependimento (CDC, art. 49):** cancelou em até 7 dias do primeiro pagamento, recebe o valor de volta. O estorno é feito pelo dono no painel do Asaas (`onboarding.md` explica); o site, ao receber o aviso de estorno, volta a conta para o Básico na hora. **[decisão do Claude]**: sem botão de estorno no `/admin` nesta versão.
- Excluir a conta (`deleteAccount`) cancela antes a assinatura no Asaas. Se o Asaas falhar, a exclusão não acontece e a pessoa vê o erro (não pode sobrar cobrança de conta apagada).

### Quando o pagamento falha **[decisão do Claude]**

- Cobrança venceu sem pagamento: a conta entra em **"pagamento pendente"** — o plano continua por **3 dias**, com aviso em todas as páginas ("Seu pagamento está pendente. Pague até DD/MM para não perder o plano X", com link para a cobrança). O Asaas manda os lembretes por e-mail/SMS (pacote padrão).
- Passados 3 dias sem pagar: volta ao Básico. A assinatura continua aberta no Asaas; se a pessoa pagar a cobrança atrasada depois, o plano volta na hora.
- Cobrança atrasada por mais de 30 dias: a assinatura é cancelada no Asaas, para não acumular cobranças.
- Contestação no cartão (chargeback) ou estorno: volta ao Básico na hora **e a assinatura é cancelada no Asaas**, para não haver nova cobrança.
- Toda assinatura que termina (cancelada, vencida, estornada) leva a conta ao **Básico**, mesmo que antes ela tivesse um plano manual; o dono pode reaplicar o plano manual depois. **[decisão do Claude]**
- **[decisão do Claude]** Sem negativação no Serasa e sem notificação por WhatsApp pago (custam por envio).

### Nota fiscal

- **O dono vende como pessoa física (só CPF), então não há NFS-e nesta versão.** A conta Asaas é aberta no CPF dele; o cliente recebe o comprovante de pagamento do próprio Asaas.
- Nada no código depende de nota fiscal. Se o dono abrir CNPJ depois, a emissão automática (R$ 0,49 por nota) é ligada no painel do Asaas, sem mudar o Nichemap.
- Imposto de renda sobre o que receber como pessoa física fica com o dono (o `onboarding.md` só recomenda conversar com um contador; não é orientação fiscal).

### Admin

- `/admin` ganha, por conta: situação da assinatura (sem assinatura, aguardando pagamento, ativa, pagamento pendente, cancelada — ativa até DD/MM), ciclo, próximo vencimento e link para o cliente no painel do Asaas. Os totais ganham "assinaturas ativas" e "receita mensal estimada" (anual ÷ 12), marcada como estimativa.
- **Mudar plano à mão continua existindo** para cortesia e para quem já paga por Pix fora do site, **mas fica bloqueado enquanto a conta tiver assinatura aberta no Asaas ou período pago em andamento** — aguardando pagamento, ativa, pagamento pendente, rebaixada por atraso com a cobrança ainda aberta, ou cancelada mas ativa até DD/MM ("Plano controlado pela assinatura"). Libera só sem assinatura ou com ela encerrada. Assim nada que o dono faça à mão é desfeito por um webhook, e vice-versa.
- **Contas cortesia (pedido do dono):** o dono pode dar Intermediário ou Completo de graça, **para sempre**, a quem quiser (parceiros, amigos, testes).
  - No `/admin`, junto da mudança de plano, uma opção "Cortesia (nunca cobra)". Guardada numa coluna própria na conta, separada do plano, para não confundir com quem paga por Pix fora do site.
  - Não expira e não passa por cobrança, cron nem webhook. Só o dono tira, voltando o plano ou desmarcando a cortesia.
  - O cliente vê "Plano Completo — cortesia" em `/conta` e `/plano`, sem botões "Assinar" nem "Cancelar". **[decisão do Claude]**
  - Segue a mesma trava das mudanças manuais: não dá para marcar cortesia numa conta com assinatura aberta. O dono precisa cancelar a assinatura antes.
  - Nos totais do `/admin`, as cortesias aparecem contadas à parte e ficam fora da receita estimada.
- Clientes que já pagam por Pix hoje: continuam com o plano manual. O dono avisa que podem assinar pelo site quando quiserem; ao assinar, a assinatura passa a mandar.

### Termos e privacidade

- `/termos`: preços e ciclos, renovação automática, como cancelar, acesso até o fim do período pago, 3 dias de tolerância, direito de arrependimento de 7 dias, Básico gratuito.
- `/privacidade`: CPF/CNPJ, nome, e-mail e celular são enviados ao Asaas (processador de pagamento) para cobrar e emitir nota; o Nichemap não guarda CPF nem cartão.
- Continuam precisando de revisão jurídica (pendência já registrada no `PRODUCT.md`).

## Como funciona por dentro

- **Fonte da verdade do acesso continua sendo `user.plan`.** O controle de acesso (`src/lib/access.ts`, `requireViewer`) não muda. O módulo de cobrança só escreve `user.plan` (via `setPlan` ou equivalente na mesma transação).
- **Tabelas novas** (Drizzle em `src/db/schema/`, SQL gerado e revisado):
  - `subscription`: uma por usuário — usuário (único), id do cliente e da assinatura no Asaas, plano, ciclo (mensal/anual), situação, fim do período pago, desde quando está pendente, plano agendado para o próximo ciclo, datas de criação/atualização.
  - `billing_event`: id do evento do Asaas (chave primária), tipo, recebido em, processado em. Serve para não processar o mesmo aviso duas vezes (o Asaas entrega "pelo menos uma vez").
- **Webhook** `POST /api/billing/webhook`:
  - Recusa (401) se o cabeçalho `asaas-access-token` não bater com `ASAAS_WEBHOOK_TOKEN` (comparação em tempo constante).
  - Grava o id do evento; se já existia, responde 200 sem fazer nada.
  - Não confia no conteúdo do aviso para decidir o plano: busca a cobrança/assinatura na API do Asaas pelo id e decide a partir dela. **[decisão do Claude]**
  - Eventos usados: pagamento confirmado/recebido, vencido, estornado, contestação, cobrança removida, assinatura removida/inativada. Os nomes exatos vêm da doc do Asaas ("Eventos para cobranças", "Eventos para assinaturas").
  - Responde 200 rápido; falha de processamento responde 500 para o Asaas reenviar (e não marca o evento como processado).
- **Regras como função pura**: (situação atual + evento + data) → (nova situação + plano). Testada sem banco e sem rede.
- **Prazos** (3 dias de tolerância, fim do período pago após cancelar, 30 dias de atraso): verificados pela coleta diária que já existe (`/api/cron`, protegida por `CRON_SECRET`), mais uma checagem ao carregar a conta. Sem fila nova.
- **Variáveis novas (só servidor, `.env.local`/Vercel, nunca `NEXT_PUBLIC_*`)**: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` (32 a 255 caracteres), `ASAAS_ENV` (`sandbox` | `production`, padrão `sandbox`). Validadas com Zod em `env-schema.ts`. Sem elas, os botões "Assinar" mostram "Assinaturas indisponíveis no momento" e o site segue funcionando.
- **Cliente HTTP do Asaas**: `fetch` com a chave no cabeçalho, sem SDK novo. Logs (Pino) sem chave, token, CPF nem corpo completo das respostas.
- `src/app` e `src/components` continuam sem importar `@/db`: tudo passa por `src/lib/billing*.ts`.

## Não objetivos

- Cupons, descontos, afiliados, período de teste.
- Parcelamento do anual no cartão. **[decisão do Claude]**: o anual é cobrado à vista; parcelar fica para depois.
- Cobrança proporcional (pro rata) em troca de plano.
- Botão de estorno no `/admin`.
- Vários perfis por conta, planos para agências.
- Dados de cartão ou CPF no banco do Nichemap.

## Anti-objetivos (falhou mesmo que funcione)

- Plano liberado sem pagamento confirmado pelo Asaas (por exemplo, confiando só na volta da página de pagamento ou num webhook sem token).
- Cliente cobrado depois de cancelar ou de excluir a conta.
- Cliente que pagou ficando sem o plano por um aviso perdido ou repetido.
- Chave do Asaas, token do webhook ou CPF em código, Git, log ou no navegador.
- Ativar conta real (produção) no Asaas ou receber dinheiro de verdade sem o OK explícito do dono.

## Restrições

- Stack e regras do `AGENTS.md` (Next 16.4, Drizzle, Zod, Pino, Vitest; arquivos ≤ 350 linhas; pt-BR; mobile-first 375 px).
- Depende do projeto 1 (PR gabrielrichardy/nichemap#28) já na `main`.
- Implementação só depois deste documento aprovado, numa branch `feature/`, com PR.
- Tudo testado no **sandbox** do Asaas. Conta de produção, chaves reais e configuração de nota fiscal são do dono, com OK explícito.
- Pronto quando: `npm run check` verde; testes da função de regras cobrindo todos os eventos e prazos; teste do webhook (token errado = 401, evento repetido não reaplica, falha = 500 sem marcar processado); assinatura completa no sandbox (assinar → pagar Pix → plano liberado → vencer → pendente → Básico → pagar → volta → cancelar) conferida de verdade, com o webhook do sandbox apontando para um preview.
- `PRODUCT.md`, `docs/architecture.md`, `docs/onboarding.md`, `docs/setup.md` e `.env.example` atualizados junto.

## Deixado para quem construir

- Como criar a assinatura para que a pessoa escolha o meio na primeira cobrança **e** o cartão seja cobrado sozinho nos meses seguintes (meio "indefinido" na assinatura, Asaas Checkout recorrente, ou escolha do meio no Nichemap antes de redirecionar). Confirmar no sandbox; se o Asaas obrigar a escolher o meio antes, a página de planos pergunta "Pix, cartão ou boleto" antes de redirecionar.
- Se o Pix vira Pix Automático (autorização única) ou Pix mensal com aviso por e-mail. Preferência: Pix Automático, se disponível na conta.
- Layout dos cartões de plano e do aviso de pagamento pendente (seguir `docs/design.md`).
- Nomes de colunas, índices e divisão dos arquivos `src/lib/billing*.ts`.

## Respostas do dono (2026-10-19)

1. Preços: aprovados (R$ 59,90 / R$ 99,90 por mês; anual com 2 meses grátis).
2. Básico grátis: sim.
3. CNPJ: não, só CPF — sem nota fiscal por enquanto.
4. Asaas: sim, conta aberta pelo dono.
5. Contas que não pagam: sim, como "cortesia", valendo para sempre (seção Admin).
