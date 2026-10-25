/// <reference types="vite/client" />

/** Settings read from frontend/.env (see .env.example). */
interface ImportMetaEnv {
  /** Backend address in production; empty in development (Vite proxy) */
  readonly VITE_API_URL?: string;
  /** Supabase project for the Google login; empty = no login (development) */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** "true" in the public demo: shows the fictional-data badge */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
