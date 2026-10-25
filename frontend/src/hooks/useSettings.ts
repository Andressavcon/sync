import { create } from "zustand";
import { persist } from "zustand/middleware";
import { settingsRepository, type UserSettings } from "@/data/repositories/settingsRepository";

interface SettingsState extends UserSettings {
  /** Last error saving, to show on the settings page */
  error: string | null;
  /** Fetches the saved settings from the server (called when the app opens) */
  load: () => Promise<void>;
  setBillReminderDay: (day: number) => Promise<void>;
  setWeeklyWorkoutGoal: (goal: number) => Promise<void>;
}

/**
 * Settings live on the server (the Dashboard uses them). A copy stays in the browser,
 * so the screens have values right away and offline.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => {
      async function save(changes: Partial<UserSettings>) {
        set({ ...changes, error: null }); // the screen changes right away
        try {
          set(await settingsRepository.update(changes));
        } catch {
          set({ error: "Não foi possível salvar no servidor." });
        }
      }

      return {
        billReminderDay: 5,
        weeklyWorkoutGoal: 5,
        error: null,
        load: async () => {
          try {
            set(await settingsRepository.get());
          } catch {
            // offline: keep the saved copy
          }
        },
        setBillReminderDay: (day) => save({ billReminderDay: day }),
        setWeeklyWorkoutGoal: (goal) => save({ weeklyWorkoutGoal: goal }),
      };
    },
    {
      name: "sync:settings",
      version: 1,
      // Only the values are cached, not the error or the functions
      partialize: (state) => ({
        billReminderDay: state.billReminderDay,
        weeklyWorkoutGoal: state.weeklyWorkoutGoal,
      }),
      // Version 0 used Portuguese names
      migrate: (saved, version) => {
        const old = (saved ?? {}) as Record<string, number | undefined>;
        if (version === 0) {
          return {
            billReminderDay: old.diaLembreteContas ?? 5,
            weeklyWorkoutGoal: old.metaTreinosSemana ?? 5,
          } as SettingsState;
        }
        return old as unknown as SettingsState;
      },
    }
  )
);
