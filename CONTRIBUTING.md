# Contribuindo

Este repositório segue um fluxo de trabalho simples de produção. A `main` é
protegida: **toda mudança entra via Pull Request** e só mergeia após os checks
de CI (`lint` + `build`) passarem. O job `lint` também roda tipos, self-check das regras e testes.

## Antes de começar

1. Certifique-se de estar com a `main` atualizada: `git switch main && git pull`.
2. Abra/escolha a Issue correspondente no GitHub.

## Branches

Crie uma branch a partir da `main` com prefixo descritivo:

| Tipo            | Prefixo      | Exemplo                      |
| --------------- | ------------ | ---------------------------- |
| Funcionalidade  | `feature/`   | `feature/content-module`     |
| Correção        | `fix/`       | `fix/growth-chart-tooltip`   |
| Documentação    | `docs/`      | `docs/repo-governance`       |
| Tarefa/chore    | `chore/`     | `chore/upgrade-next`         |

```bash
git switch -c feature/nome-da-branch
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona módulo de conteúdo
fix: corrige tooltip do gráfico de crescimento
docs: melhora README
chore: atualiza dependências
```

Mensagens em português são bem-vindas no corpo; o tipo/escopo em inglês seguem
o padrão.

## Pull Request

1. Faça push da branch: `git push -u origin feature/nome-da-branch`.
2. Abra o PR e referencie a issue (`Closes #123`).
3. Rode `npm run check` localmente e aguarde o CI (lint + build). O `CODEOWNERS` solicita revisão automaticamente.
4. Após aprovação e checks verdes, faça o merge na `main`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha (detalhes em `docs/onboarding.md`). **Nunca commite o
`.env.local`** — ele já está no `.gitignore`.
