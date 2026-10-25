# Sync.

Aplicativo pessoal para organizar o dia a dia num lugar só: tarefas da semana (Kanban), treinos com cronômetro, lista de compras e finanças (cartões, faturas, contas fixas e caixinha). Funciona no celular, tablet e computador, e pode ser instalado como app (PWA).

> 🚧 Em construção. Front-end em andamento; back-end em Python sendo montado módulo por módulo.

## Estrutura

| Pasta | O que tem |
|---|---|
| [`frontend/`](frontend/) | React + TypeScript + Vite + Tailwind |
| `backend/` | Python + FastAPI + PostgreSQL *(em breve)* |
| [`docs/`](docs/documentacao.md) | Documentação completa: regras de cada módulo, decisões e arquitetura |

## Stack

**Front-end:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, zustand, @dnd-kit, date-fns, lucide-react.

**Back-end:** Python, FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL (Supabase), pytest.

## Como rodar

```bash
# front-end
cd frontend
npm install
npm run dev
```

O back-end terá as instruções aqui assim que a primeira versão estiver pronta.

## Módulos

- **Kanban:** semana atual em grade, arrastar cards entre os dias, atrasados, eventos futuros com contagem regressiva e filtro por tags.
- **Treinos:** o treino do dia é montado com blocos (programas ou treinos avulsos), com cronômetro por etapa (tempo, repetições e distância).
- **Lista de compras:** itens por categoria, seção "Importante" e registro do total gasto.
- **Finanças:** cartões e faturas, compras parceladas, contas fixas, caixinha e o cálculo de quanto ainda dá para gastar no ciclo e na semana.
- **Configurações:** ligar e desligar módulos e ajustar preferências.
