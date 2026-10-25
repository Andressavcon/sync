import { api } from "@/data/api";
import type { CardStatus } from "@/data/repositories/kanbanRepository";
import type { BlockState } from "@/data/repositories/workoutsRepository";

// Mirror app/modules/dashboard/schemas.py

export interface DashboardCard {
  id: string;
  title: string;
  status: CardStatus;
  dueDate: string;
  dueTime: string;
  isLate: boolean;
  daysUntil: number;
}

export type DayMark = "done" | "missed" | "rest" | "today";

export interface Dashboard {
  today: string;
  kanban: { today: DashboardCard[]; late: DashboardCard[]; upcoming: DashboardCard[] };
  workouts: {
    blocks: { title: string; state: BlockState }[];
    doneBlocks: number;
    state: "empty" | "not_started" | "in_progress" | "done";
    lastDays: { day: string; mark: DayMark }[];
    monthCompleted: number;
    monthGoal: number;
  };
  bills: {
    hasBills: boolean;
    active: boolean;
    allPaid: boolean;
    nextDueDate: string | null;
    daysToNextDue: number | null;
  };
  /** Only the share of the week's money used: the Dashboard shows no values */
  spending: { percent: number | null; over: boolean };
}

export const dashboardRepository = {
  get: () => api.get<Dashboard>("/api/dashboard"),
};
