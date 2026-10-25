import { NavLink } from "react-router-dom";
import { X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEnabledModules } from "@/hooks/useModules";
import { useSidebar } from "@/hooks/useSidebar";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const modules = useEnabledModules();
  const { collapsed, toggle } = useSidebar();

  return (
    <>
      {/* fundo escuro atrás da gaveta (só no celular) */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface p-4 transition-all",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-16 lg:p-2" : "lg:w-64",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div
          className={[
            "mb-6 flex items-center justify-between",
            collapsed ? "lg:justify-center" : "",
          ].join(" ")}
        >
          <span className="text-2xl font-bold">
            S<span className={collapsed ? "lg:hidden" : ""}>ync</span>
            <span className="text-primary">.</span>
          </span>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-surface-hover lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {modules.map(({ id, label, path, icon: Icon }) => (
            <NavLink
              key={id}
              to={path}
              title={label}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed ? "lg:justify-center lg:px-0" : "",
                  isActive ? "bg-primary text-bg" : "text-text hover:bg-surface-hover",
                ].join(" ")
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* botão de expandir/recolher (só no desktop) */}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={[
            "mt-2 hidden items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-text lg:flex",
            collapsed ? "lg:justify-center lg:px-0" : "",
          ].join(" ")}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span className={collapsed ? "lg:hidden" : ""}>Recolher</span>
        </button>
      </aside>
    </>
  );
}