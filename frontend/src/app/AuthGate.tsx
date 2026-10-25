import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { loginEnabled, setAccessToken, supabase } from "@/data/auth";
import LoginPage from "@/features/auth/LoginPage";

/**
 * Shows the app only to logged-in users when the login is configured.
 * Without it (development), the app opens directly.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  // undefined = still checking; null = logged out
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    const apply = (current: Session | null) => {
      setAccessToken(current?.access_token ?? null);
      setSession(current);
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    // Login, logout and the automatic token refresh
    const { data } = supabase.auth.onAuthStateChange((_event, current) => apply(current));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!loginEnabled) return <>{children}</>;
  if (session === undefined) return <p className="py-10 text-center text-muted">Carregando…</p>;
  if (session === null) return <LoginPage />;
  return <>{children}</>;
}
