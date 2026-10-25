import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LogOut } from "lucide-react";
import { loginEnabled, signOut } from "@/data/auth";
import { useNow } from "@/hooks/useNow";
import NotificationBell from "./NotificationBell";

const isDemo = import.meta.env.VITE_DEMO === "true";

/** Floating glass pill at the top: logo, demo badge, today's date, notifications and logout. */
export default function Header() {
  const now = useNow();

  return (
    <header className="glass sticky top-3 z-30 mx-3 flex h-14 items-center gap-4 rounded-full px-5 lg:mx-8">
      <span className="text-lg font-bold">
        Sync<span className="text-primary">.</span>
      </span>
      {isDemo && (
        <span
          title="Versão de demonstração: os dados são fictícios e voltam ao original de tempos em tempos"
          className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary"
        >
          Demo<span className="hidden sm:inline"> · dados fictícios</span>
        </span>
      )}
      <span className="hidden text-sm text-muted first-letter:uppercase sm:block">
        {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        {loginEnabled && (
          <button
            type="button"
            aria-label="Sair"
            title="Sair"
            onClick={() => void signOut()}
            className="rounded-full p-2 text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
