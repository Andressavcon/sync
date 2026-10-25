# Sync.

A personal app to organize everyday life in one place: weekly tasks (Kanban), workouts with a timer, a shopping list and personal finance (credit cards, invoices, fixed bills, savings pots and how much is still left to spend).

It works on phone, tablet and desktop, can be installed as an app (PWA), and parts of it work offline.

To try it, clone the repository and run it locally (see [Running locally](#running-locally)). With no configuration it starts without login, using a development user and a local SQLite database.

> The backend was my first Python project. I come from Java, so the code has comments comparing both worlds (FastAPI ≈ Spring Web, SQLAlchemy ≈ JPA, Alembic ≈ Flyway).

---

## Modules

### Dashboard
The home screen shows the day in one place:
- today's tasks (pending and in progress) and the overdue ones, highlighted;
- upcoming events with a countdown;
- today's workout, with its progress, dots for the last 5 days and today, and the month total (x/N);
- a fixed-bills reminder starting on the 5th ("X days left");
- how much of this week's money has already been used.

The Dashboard never shows amounts, only percentages.

### Kanban
- **The week:** a grid with the 7 days of the current week, with no horizontal scrolling. Cards can be dragged between days.
- **Sections:**
  - Done;
  - Overdue: cards from weeks that have already passed;
  - Upcoming events: dates beyond this week.

  Sections and tags can be filtered.
- **The card:** opens like a page, with title, tags, status (pending, in progress, done), day, time and free space for notes.
- **Recurring tasks:**
  - frequencies: every day, chosen weekdays, or a day of the month (the 31st falls on the last day of the month);
  - each occurrence is an independent card;
  - when editing or deleting, the app asks whether the change is for "this one only" or "this and the following ones".
- **Reminders:** on the day, or N days/weeks before. They show up in the app's bell.

### Workouts
- **No fixed plan per weekday:** the day's workout is built by dragging blocks from the library. There are two kinds of block:
  - **programs with sessions**, for example a 21-day program;
  - **standalone workouts**, for example running or yoga.
- **Steps:** each block is a list of steps of three types, which can be mixed:
  - **timed:** advances on its own;
  - **reps:** you complete each set and the rest starts automatically;
  - **distance:** you mark it when you finish.
- **Timer:**
  - opens full screen, with pause, skip and go back;
  - counts from each step's end time, so it does not lose time when the screen is locked or the app is in the background;
  - keeps the screen on during the workout;
  - closing it midway saves the progress.
- **History:** a monthly calendar, read-only.

### Shopping list
- There is one active list, with items grouped by category. Categories can be edited and reordered to match the store's layout.
- The **Important** section sits at the top and gathers the flagged items from every category.
- When typing an item, the app suggests the items bought most often in previous lists.
- **Recording the expense:** when leaving the store, you record only the total paid and the payment method. The expense goes straight to Finance, and onto the invoice if paid by card.
- **Finish list:** archives the list for 90 days, read-only. Items that were not bought move to the new list.
- **Offline:** the list opens and items can be checked without internet. The checks are sent when the connection comes back.

### Finance
- **Cards and invoices:**
  - each card has a default closing day;
  - the app reminds you to check the closing date every month;
  - whether a purchase made on the closing day goes to the next invoice is a per-card option;
  - a card with history is archived instead of deleted.
- **Installment purchases:** you enter the installment amount and the number of installments. Future invoices list each installment ("TV, installment 3/10").
- **Fixed bills** (rent, condo fee, gas...):
  - kept apart from the cards;
  - the amount can change every month;
  - each has a "paid" check.
- **Savings pots:** named pots (Travel, Emergency...). Whatever goes into a pot comes out of the money available to spend.
- **Salary:** amount and payday. It defines the **cycle**, which runs from one salary to the next.
- **Available to spend:** calculated by the app, with no limit to type in.

  > available = salary − fixed bills − invoices due in the cycle − one-off pix and boleto payments − money moved to savings pots

  The **weekly available** amount is what is left in the cycle divided by the remaining weeks. It is recalculated after every expense: if you save, next week goes up. Extra income can be counted or left out of the calculation.

### Notifications and Settings
- **Notifications:** in-app only, in the header bell, with the number of unread reminders.
- **Settings:**
  - turn each module on or off;
  - choose the day of the bills reminder;
  - set the weekly workout goal.

### Login
- Google login through Supabase Auth.
- The first login creates the user, and each person sees only their own data.
- Signing out clears the offline copies stored on the device.

---

## Stack

| | |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, @dnd-kit, date-fns, zustand, vite-plugin-pwa |
| **Backend** | Python 3.14, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, pytest, Ruff, uv |
| **Database** | SQLite in development, PostgreSQL (Supabase) in production |
| **Login** | Google, through Supabase Auth (the backend validates the JWT against the public keys, JWKS) |
| **Hosting** | Vercel (frontend), Render (API), Supabase (database + login), all on the free tier |
| **CI** | GitHub Actions: lint, tests on SQLite and PostgreSQL, migration checks and the frontend build |

## Architecture

The repository is a monorepo with two folders:

```
frontend/   the React app (PWA)
backend/    the Python API
```

**Business rules live in the backend**, in pure functions tested without a database. The frontend only displays. The functions are:
- `kanban/board.py`: the week's sections;
- `kanban/recurrence.py`: recurrence dates;
- `finance/invoices.py`: which invoice each purchase falls on;
- `finance/available.py`: money available to spend;
- `notifications/rules.py`: when to remind.

### Backend (`backend/app/modules/`)

Every module follows the same layers, similar to a Spring project:

| File | Role | In Java |
|---|---|---|
| `models.py` | tables | `@Entity` |
| `schemas.py` | JSON input and output | DTO / record |
| `repository.py` | database queries | Repository |
| `service.py` | business rules | `@Service` |
| `router.py` | endpoints | `@RestController` |

The modules are `kanban`, `shopping`, `workouts`, `finance`, `notifications`, `settings`, `dashboard` (which only reads the others) and `users`.

**Conventions:**
- All code is in English. The UI is in Portuguese.
- The API's JSON is camelCase; Python uses snake_case, and Pydantic converts between them.
- Money is always `Decimal`, never `float`.
- Every table has a `user_id`, and every query filters by the logged-in user. IDs are UUIDs.
- Calendar dates (task day, workout day) have no time zone. Exact moments (created, paid) are stored in UTC. "Today" is computed in the `America/Sao_Paulo` time zone.
- Errors become clear HTTP responses: 401, 404, 409 and 422.
- In production, the backend refuses to start without login configured or with SQLite.

### Frontend (`frontend/src/`)
- `features/`: one folder per module. A feature never imports from another.
- `data/`: the API client, login and one repository per module. Screens never call the API directly.
- `components/ui/`: shared components.
- `styles/index.css`: the theme tokens.
- Each page is lazy-loaded.

### Look and feel
The style is **"liquid glass"**, inspired by visionOS and iOS:
- translucent, blurred glass panels over a dark background with soft color glows;
- amber (`#f59e0b`) as the accent color;
- a floating icon bar on desktop and a bottom bar on mobile.

On mobile the blur is lighter, for performance. Users who turn on "reduce transparency" in their system get solid panels.

### Offline (PWA)
- The app is installable, and its screens open offline from the service worker cache.
- The **shopping list** and **today's workout** keep their data on the device and send what was done once the connection is back.
- The other modules need a connection.

---

## Running locally

Use two terminals:

```bash
# 1. backend: http://localhost:8000 (interactive API docs at /docs)
cd backend
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py

# 2. frontend: http://localhost:5173
cd frontend
npm install
npm run dev
```

With no configuration, the app runs without login, using a development user and a local SQLite database.

To turn on Google login:
1. Create a Supabase project and enable the Google provider.
2. In the backend, set `SUPABASE_URL` in `backend/.env`.
3. In the frontend, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local`.

The `.env.example` files list every variable.

## Tests and quality

```bash
cd backend && uv run pytest && uv run ruff check .   # 218 tests (CI also runs them on PostgreSQL)
cd frontend && npm run build && npm run lint         # types + lint
```

## Deploy

It uses three free services. Passwords and keys live only in their dashboards, never in the code.

1. **Supabase:** create the project in the same region as Render (Ohio, in my case). Enable Google under *Authentication → Providers*, with the Client ID and Client secret of a Google Cloud OAuth client. The OAuth redirect is `https://<project>.supabase.co/auth/v1/callback`. Under *JWT Keys*, use the asymmetric keys (JWT Signing Keys).
2. **Render:** create a *New → Blueprint* from this repository. The `render.yaml` file already defines the service, and migrations run on every deploy. Fill in:
   - `DATABASE_URL`: the Supabase **Session pooler** URI. The direct connection only works over IPv6, and Render's free tier only has IPv4.
   - `SUPABASE_URL`;
   - `CORS_ORIGINS`: with the Vercel address.
3. **Vercel:** import the repository with **Root Directory `frontend`** and set `VITE_API_URL` (the Render address), `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. **Connect the ends:** in Supabase, under *URL Configuration*, set the Vercel address as the Site URL and as a Redirect URL.

Render's free tier "sleeps" after 15 minutes without use, so the first request after that takes about a minute. Supabase's free tier has no automatic backups: export the database now and then, under *Database → Backups* or with `pg_dump`.

## Next steps
- Recurring income in Finance.
- Editing a card's recurrence rule from the UI.
- Automated frontend tests (Vitest).
- Sharing the app with other people.
- Full offline mode, with sync.
