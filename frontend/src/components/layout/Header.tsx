import { Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Header({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur">
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={onMenu}
        className="rounded-lg p-2 hover:bg-surface-hover lg:hidden"
      >
        <Menu size={20} />
      </button>
      <span className="text-lg font-bold lg:hidden">
        Sync<span className="text-primary">.</span>
      </span>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}
