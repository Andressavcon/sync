import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MODULES, type ModuleId } from "@/lib/modules";

interface ModulesState {
  enabled: Record<ModuleId, boolean>;
  toggle: (id: ModuleId) => void;
}

const initial = Object.fromEntries(MODULES.map((m) => [m.id, true])) as Record<ModuleId, boolean>;

export const useModulesStore = create<ModulesState>()(
  persist(
    (set) => ({
      enabled: initial,
      toggle: (id) =>
        set((s) => {
          const mod = MODULES.find((m) => m.id === id);
          if (!mod?.toggleable) return s;
          return { enabled: { ...s.enabled, [id]: !s.enabled[id] } };
        }),
    }),
    { name: "sync:modules" }
  )
);

/** Módulos ativos, na ordem do menu */
export function useEnabledModules() {
  const enabled = useModulesStore((s) => s.enabled);
  return MODULES.filter((m) => !m.toggleable || enabled[m.id]);
}
