# Sync.

Aplicativo pessoal para organizar o dia a dia num lugar só: tarefas da semana (Kanban), treinos com cronômetro, lista de compras e finanças (cartões, faturas, contas fixas, caixinha e quanto ainda dá para gastar). Funciona no celular, tablet e computador, pode ser instalado como app (PWA) e tem partes que funcionam sem internet.

## Módulos

- **Dashboard:** o dia num lugar só: tarefas de hoje e atrasadas, eventos com contagem regressiva, treino do dia, lembrete de contas e quanto do dinheiro da semana já foi usado.
- **Kanban:** a semana em grade, arrastar cards entre os dias, atrasados, eventos futuros, tags, tarefas recorrentes ("só esta" ou "esta e as próximas") e lembretes.
- **Treinos:** o treino do dia montado com blocos (programas com sessões ou treinos avulsos), etapas por tempo, repetições ou distância, e um cronômetro que não perde tempo com a tela bloqueada.
- **Lista de compras:** itens por categoria, seção "Importante", sugestões dos itens mais comprados, listas anteriores, registro do gasto direto em Finanças e uso **offline** no mercado.
- **Finanças:** cartões e faturas (com fechamento ajustável), compras parceladas, contas fixas, caixinha e o cálculo do **disponível para gastar** no ciclo e na semana.
- **Notificações e Configurações:** lembretes dentro do app, módulos ligados/desligados e preferências.

## Stack

| | |
|---|---|
| **Front-end** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, @dnd-kit, date-fns, zustand, vite-plugin-pwa |
| **Back-end** | Python 3.14, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, pytest, Ruff, uv |
| **Banco** | SQLite no desenvolvimento, PostgreSQL (Supabase) em produção |
| **Login** | Google, pelo Supabase Auth (o back valida o JWT) |

## Estrutura

| Pasta | O que tem |
|---|---|
| [`frontend/`](frontend/) | O app React. Cada módulo em `src/features/`, acesso à API em `src/data/` |
| [`backend/`](backend/) | A API em Python. Cada módulo em `app/modules/` (models, schemas, repository, service, router) |
| [`docs/`](docs/documentacao.md) | Documentação completa: regras de cada módulo, decisões e arquitetura |

As **regras de negócio** ficam no back, em funções puras testadas sem banco: as seções da semana do Kanban, a recorrência, as datas das faturas, o disponível para gastar e os lembretes. O front só exibe.

## Como rodar

Dois terminais:

```bash
# 1. back-end: http://localhost:8000 (documentação interativa em /docs)
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py

# 2. front-end: http://localhost:5173
cd frontend
npm install
npm run dev
```

Sem configurar nada, o app roda com um usuário de desenvolvimento. Para ligar o login com Google, veja a seção 11.2 da [documentação](docs/documentacao.md).

## Qualidade

```bash
cd backend && uv run pytest && uv run ruff check .     # 218 testes
cd frontend && npm run build && npm run lint           # tipos + lint
```
