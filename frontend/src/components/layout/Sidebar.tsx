import { NavLink } from "react-router-dom";
import { useEnabledModules } from "@/hooks/useModules";

/**
 * Floating glass navigation:
 * - computer: a column of round icons on the left (the name shows on hover)
 * - phone: a bar at the bottom, like iPhone apps
 */
export default function Sidebar() {
  const modules = useEnabledModules();

  return (
    <nav
      aria-label="Módulos"
      className={[
        "glass fixed z-40 flex rounded-full p-1.5",
        // phone: bottom bar
        "inset-x-3 bottom-3 justify-around",
        // computer: column on the left, vertically centered
        "lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2 lg:flex-col lg:justify-start lg:gap-2 lg:p-2",
      ].join(" ")}
    >
      {modules.map(({ id, label, path, icon: Icon }) => (
        <NavLink
          key={id}
          to={path}
          aria-label={label}
          className={({ isActive }) =>
            [
              "group relative flex h-11 w-11 items-center justify-center rounded-full transition-all",
              isActive
                ? "bg-primary text-bg shadow-glow"
                : "text-muted hover:bg-surface-hover hover:text-text",
            ].join(" ")
          }
        >
          <Icon size={20} />
          <span className="glass-strong pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-text opacity-0 transition-opacity group-hover:opacity-100 lg:block">
            {label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
