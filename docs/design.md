# Design e acessibilidade

## Direção

Painel para social media consultar no celular, em pt-BR. Tom claro e limpo: fundo cinza-azulado, cartões brancos arredondados, acentos azul/violeta, sidebar escura no desktop. Mobile-first é requisito do produto (`PRODUCT.md`); o protótipo foi desenhado a partir de um mockup desktop e ainda precisa de ajustes para o celular (ver "Problemas observados").

## Sistema existente

- Tokens: `src/app/globals.css` (`--background: #F5F6FA`, `--foreground: #0F172A`, fonte do sistema). É a fonte de verdade; não duplique valores aqui.
- Classes Tailwind direto nos componentes; `cn()` em `src/lib/utils.ts` para combinar classes condicionais.
- Cores das séries de gráfico e temas estão em `src/lib/instagram.ts`, `src/lib/themes.ts` e `src/lib/mockData.ts`.
- Componentes: um por bloco do painel em `src/components/` (KPIs, crescimento, tipos de conteúdo, temas, mercado, conteúdos em destaque, oportunidades, cabeçalho de perfil, header, sidebar). Não há biblioteca de componentes compartilhados.

## Interação

Use HTML semântico, navegação por teclado, foco visível e contraste adequado. Dê nome a controles e campos. Erros de validação ficam junto do campo; operações assíncronas exibem espera e resultado (o painel já mostra "Carregando dados do perfil..." e erro de carregamento). Respeite movimento reduzido.

## Layout e revisão

- Breakpoints Tailwind: grade de 1 coluna no celular; `sm` 2–3 colunas; `md` mostra a sidebar fixa (256 px); `lg` grade de 3 colunas.
- Revisão em 2026-10-17, build de produção, viewports 375×812 e desktop: sem rolagem horizontal (`scrollWidth = 375`), sem erros no console.

Corrigido em 2026-10-17:

- Aviso de dados de exemplo não repete mais "Dados de exemplo".
- Header e conteúdo usam `px-4` no celular e `px-8` a partir de `md`; nome do usuário só aparece a partir de `sm`; busca de perfil (`role="search"`, `aria-label`, placeholder curto).
- Perfil inválido mostra mensagem de erro em pt-BR em vez de quebrar a página.
- Sino sem o contador "3" falso, com `aria-label` e `aria-disabled` (não há notificações).
- Sidebar: item ativo com `aria-current="page"`, itens sem módulo com `aria-disabled`; ícones decorativos com `aria-hidden`.

Em aberto:

Controles sem ação removidos (issue #23): seletor "Últimos 30 dias" (não há dados por período), sino de notificações e menu do usuário fixo. Cards ainda com dados de exemplo mostram o selo “Exemplo”; o gráfico de crescimento mostra “Histórico em construção” até haver 2 dias de coleta.

Resolvido com as páginas de seção: menu horizontal no celular (abaixo de `md`, `aria-current` no item ativo); "Ver todos" dos cards viram links para as seções; card fictício "Plano Pro" removido; o card de temas virou “Temas do perfil”, com explicação do percentual e estado vazio; a seção Pessoas saiu do menu e do painel; menu e cabeçalho somem na impressão (`print:hidden`).

Estados pertinentes: carregando, erro de rede, dados de exemplo, dados reais, falha da API (cai em exemplo com motivo). Perfil sem publicações mostra "Nenhuma publicação encontrada" (antes caía em posts de exemplo sem aviso).

## Cobrança

- `/plano` (`PlanCards`): três cartões (Básico, Intermediário, Completo), 1 coluna no celular e 3 a partir de `lg`; o plano atual tem borda azul e selo “Plano atual”. Alternância Mensal/Anual é um grupo de botões com `aria-pressed`; no anual aparece “2 meses saem de graça”. “Assinar” só aparece nos planos pagos e some para admin e cortesia.
- Checkout (`CheckoutForm`): abre abaixo dos cartões com plano, preço e ciclo; pede só CPF/CNPJ (obrigatório) e celular (opcional), cada um com dica ligada por `aria-describedby`. Erro fica junto do campo (`role="alert"`, `aria-invalid`); o botão mostra espera. O pagamento (Pix, cartão, boleto) acontece na página do Asaas.
- `/conta`: a linha Plano mostra plano e situação (“Ativa — renova em…”, “Muda para … em …”, “Pagamento pendente”, “Cancelada — ativa até…”) e o link “Pagar” enquanto há cobrança em aberto. Conta suspensa mostra “Básico” com “Plano X pausado por falta de pagamento”. O painel Assinatura (`SubscriptionPanel`) troca de plano (só ativa) e cancela num `<dialog>` de confirmação que diz até quando o plano vale.
- Aviso de atraso (`BillingBanner`): faixa âmbar no topo de todas as páginas, com ícone decorativo e botão “Pagar agora”. Em atraso, diz o prazo de tolerância; suspensa, diz que o plano foi pausado.
- `/admin` (`AdminAccountsTable`): cada conta mostra Assinatura (situação), Ciclo e “Pago até”. Plano e “Cortesia (nunca cobra)” ficam travados, com o aviso “Plano controlado pela assinatura”, enquanto houver assinatura aberta.

## Manutenção

Mudanças visuais e de interação atualizam `globals.css`/componentes e esta orientação quando a regra mudar. Use a skill `web-design-guidelines` nas revisões de UI.
