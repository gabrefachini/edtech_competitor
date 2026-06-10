# competitive-digest

MVP de inteligência competitiva semanal para concorrentes, com coleta de site, busca simples de sinais sociais, notícias recentes, scoring de impacto por produto e geração de briefing em Markdown/HTML.

## Requisitos

- Node.js 22+
- `pnpm`

## Setup

```bash
pnpm install
pnpm digest:run
```

## Arquivos de entrada

- `config/competitors.yaml`
- `config/products.yaml`

## Saída

- `data/events.jsonl`
- `data/state.json`
- `data/logs/YYYY-MM-DD.log`
- `exports/weekly/YYYY-MM-DD.md`
- `exports/weekly/YYYY-MM-DD.html`

## Como adicionar concorrentes

Edite `config/competitors.yaml` com pelo menos:

```yaml
- name: Novo Concorrente
  website: https://example.com
```

Campos opcionais:

- `socials.linkedin`
- `socials.instagram`
- `socials.youtube`
- `socials.x`
- `markets`
- `regions`
- `scope`
- `notes`

## Cron semanal

Exemplo GitHub Actions, segunda às 09:00 de São Paulo:

```yaml
name: Weekly Digest

on:
  schedule:
    - cron: "0 12 * * 1"
  workflow_dispatch:

jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm digest:weekly
```

## Observações

- O crawler respeita `robots.txt` antes de buscar URLs do site.
- Se uma fonte falhar, o run continua para os demais concorrentes.
- O MVP usa busca web simples para sinais sociais e notícias quando não houver API paga.
