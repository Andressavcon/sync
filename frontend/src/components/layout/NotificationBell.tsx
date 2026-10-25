import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { notificationsRepository } from "@/data/repositories/notificationsRepository";
import { useApiData } from "@/hooks/useApiData";

const REFRESH_MS = 5 * 60_000;

/** Header bell: unread badge and the list (in-app only). */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const { data, reload } = useApiData(`notifications:${tick}`, notificationsRepository.list);
  const panel = useRef<HTMLDivElement>(null);

  // Check again every few minutes and when the user comes back to the app
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    const id = setInterval(refresh, REFRESH_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function markRead(id: string) {
    await notificationsRepository.markRead(id).catch(() => {});
    reload();
  }

  async function markAll() {
    await notificationsRepository.markAllRead().catch(() => {});
    reload();
  }

  const unread = data?.unread ?? 0;

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        aria-label={unread ? `Notificações (${unread} não lidas)` : "Notificações"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-text transition-colors hover:bg-surface-hover"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] glass-strong rounded-3xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">Notificações</h2>
            {unread > 0 && (
              <Button variant="ghost" onClick={() => void markAll()}>
                <CheckCheck size={14} /> Marcar todas
              </Button>
            )}
          </header>
          {!data || data.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              Nenhuma notificação. Ative um lembrete num card do Kanban.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {data.items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => !n.read && void markRead(n.id)}
                    className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-hover ${n.read ? "opacity-60" : ""}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{n.title}</span>
                      <span className="block text-xs text-muted">
                        {n.message} · {format(parseISO(n.dueDate), "dd/MM")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
