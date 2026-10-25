# Sync. — Front-end

React + TypeScript + Vite + Tailwind CSS v4. Installable PWA.

```bash
npm install
npm run dev      # development server: http://localhost:5173 (/api goes to localhost:8000)
npm run build    # type check + production build (with the service worker)
npm run lint
```

Configuration: copy `.env.example` to `.env.local`. Without the Supabase variables the app
opens without login (development).

- `src/features/` — one folder per module (dashboard, kanban, workouts, shopping, finance, settings, auth)
- `src/data/` — API client, login and one repository per module (screens never call the API directly)
- `src/components/ui/` — shared components; the visual style lives there and in `src/styles/index.css`

Architecture and conventions: see the [main README](../README.md#architecture).
