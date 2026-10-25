import { Bell } from "lucide-react";

export default function NotificationBell() {
  // TODO: ligar às notificações (seção 6) e mostrar indicador de não lidas
  return (
    <button
      type="button"
      aria-label="Notificações"
      className="relative rounded-lg p-2 text-text hover:bg-surface-hover"
    >
      <Bell size={20} />
    </button>
  );
}
