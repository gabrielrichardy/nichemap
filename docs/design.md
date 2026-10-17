# Design e acessibilidade

## Direção

Painel para social media consultar no celular, em pt-BR. Tom claro e limpo: fundo cinza-azulado, cartões brancos arredondados, acentos azul/violeta, sidebar escura no desktop. Mobile-first é requisito do produto (`PRODUCT.md`); o protótipo foi desenhado a partir de um mockup desktop e ainda precisa de ajustes para o celular (ver "Problemas observados").

## Sistema existente

- Tokens: `src/app/globals.css` (`--background: #F5F6FA`, `--foreground: #0F172A`, fonte do sistema). É a fonte de verdade; não duplique valores aqui.
- Classes Tailwind direto nos componentes; `cn()` em `src/lib/utils.ts` para combinar classes condicionais.
- Cores das séries de gráfico e temas estão em `src/lib/instagram.ts` e `src/lib/mockData.ts`.
- Componentes: um por bloco do painel em `src/components/` (KPIs, crescimento, tipos de conteúdo, temas, mercado, conteúdos em destaque, pessoas, oportunidades, cabeçalho de perfil, header, sidebar). Não há biblioteca de componentes compartilhados.

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

1. **Sem navegação no celular**: a sidebar é `hidden md:flex`. Hoje só o Dashboard existe, então não há para onde navegar; criar o menu mobile junto do segundo módulo.
2. **Botões sem ação no painel**: "Ver todos/Ver todas", seletor "Últimos 30 dias" e menu do usuário não fazem nada nem são anunciados como indisponíveis.
3. Dados ilustrativos fixos ("Gabriel / Social Media", "Plano Pro — Expira em 12/2025").

Estados pertinentes: carregando, erro de rede, dados de exemplo, dados reais, falha da API (cai em exemplo com motivo). Não há estado vazio para perfil sem publicações.

## Manutenção

Mudanças visuais e de interação atualizam `globals.css`/componentes e esta orientação quando a regra mudar. Use a skill `web-design-guidelines` nas revisões de UI.
