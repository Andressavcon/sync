import { api } from "@/data/api";

/** Preferences other modules use, mirror app/modules/settings/schemas.py */
export interface UserSettings {
  billReminderDay: number;
  weeklyWorkoutGoal: number;
}

export const settingsRepository = {
  get: () => api.get<UserSettings>("/api/settings"),
  update: (changes: Partial<UserSettings>) => api.patch<UserSettings>("/api/settings", changes),
};
