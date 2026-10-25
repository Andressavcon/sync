import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  /** Day of the month the Dashboard starts the fixed bills reminder (section 5) */
  billReminderDay: number;
  /** Workouts per week; the month goal is this × 4 (section 7.5) */
  weeklyWorkoutGoal: number;
  setBillReminderDay: (day: number) => void;
  setWeeklyWorkoutGoal: (goal: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      billReminderDay: 5,
      weeklyWorkoutGoal: 5,
      setBillReminderDay: (day) => set({ billReminderDay: day }),
      setWeeklyWorkoutGoal: (goal) => set({ weeklyWorkoutGoal: goal }),
    }),
    {
      name: "sync:settings",
      version: 1,
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
