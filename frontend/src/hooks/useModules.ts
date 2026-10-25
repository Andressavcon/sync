import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MODULES, type ModuleId } from "@/lib/modules";

interface ModulesState {
  enabled: Record<ModuleId, boolean>;
  toggle: (id: ModuleId) => void;
}

const initial = Object.fromEntries(MODULES.map((m) => [m.id, true])) as Record<ModuleId, boolean>;

// Version 0 used Portuguese ids; version 1 uses English ones
const OLD_IDS: Record<string, ModuleId> = {
  treinos: "workouts",
  compras: "shopping",
  financas: "finance",
  configuracoes: "settings",
};

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
    {
      name: "sync:modules",
      version: 1,
      migrate: (saved, version) => {
        const old = (saved as { enabled?: Record<string, boolean> } | undefined)?.enabled ?? {};
        const enabled = { ...initial };
        for (const [key, value] of Object.entries(old)) {
          const id = version === 0 ? (OLD_IDS[key] ?? key) : key;
          if (id in enabled) enabled[id as ModuleId] = value;
        }
        return { enabled } as ModulesState;
      },
    }
  )
);

/** Enabled modules, in menu order */
export function useEnabledModules() {
  const enabled = useModulesStore((s) => s.enabled);
  return MODULES.filter((m) => !m.toggleable || enabled[m.id]);
}
