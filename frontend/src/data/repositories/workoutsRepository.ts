import { api } from "@/data/api";

// ---------- Types (mirror app/modules/workouts/schemas.py) ----------

/** Runs by itself: countdown, then the rest */
export interface TimeStep {
  type: "time";
  name: string;
  durationSec: number;
  restSec: number;
}

/** Each set finished by hand; rest between sets runs by itself */
export interface RepsStep {
  type: "reps";
  name: string;
  sets: number;
  reps: number;
  restSec: number;
}

/** No timer: checked by hand */
export interface DistanceStep {
  type: "distance";
  name: string;
  km: number;
}

/** "type" tells which one it is (a TypeScript discriminated union, like the backend) */
export type Step = TimeStep | RepsStep | DistanceStep;
export type StepType = Step["type"];

export interface Session {
  id: string;
  number: number;
  steps: Step[];
}

export interface Program {
  id: string;
  name: string;
  sessions: Session[];
}

export interface Standalone {
  id: string;
  name: string;
  steps: Step[];
}

export interface Library {
  programs: Program[];
  standalone: Standalone[];
}

export type SourceType = "session" | "standalone";
export type BlockState = "not_started" | "in_progress" | "done";

export interface Block {
  id: string;
  day: string;
  position: number;
  sourceType: SourceType;
  sourceId: string;
  title: string;
  steps: Step[];
  state: BlockState;
  /** Where the timer stopped */
  stepIndex: number;
  /** Time left on a timed step when the timer was closed */
  remainingMs: number | null;
}

export interface Day {
  day: string;
  blocks: Block[];
  completed: boolean;
  readOnly: boolean;
}

export interface BlockProgress {
  state?: BlockState;
  stepIndex?: number;
  /** null clears it (manual steps have no time left) */
  remainingMs?: number | null;
}

export interface HistoryDay {
  day: string;
  blocks: { title: string; state: BlockState }[];
  completed: boolean;
}

export interface MonthHistory {
  month: string;
  days: HistoryDay[];
  completedDays: number;
}

// ---------- Calls ----------

const BASE = "/api/workouts";

export const workoutsRepository = {
  getLibrary: () => api.get<Library>(`${BASE}/library`),

  createProgram: (name: string, sessionCount: number) =>
    api.post<Program>(`${BASE}/programs`, { name, sessionCount }),
  renameProgram: (id: string, name: string) => api.patch<Program>(`${BASE}/programs/${id}`, { name }),
  deleteProgram: (id: string) => api.delete(`${BASE}/programs/${id}`),
  addSession: (programId: string, steps: Step[] = []) =>
    api.post<Session>(`${BASE}/programs/${programId}/sessions`, { steps }),
  updateSession: (id: string, steps: Step[]) => api.put<Session>(`${BASE}/sessions/${id}`, { steps }),
  deleteSession: (id: string) => api.delete(`${BASE}/sessions/${id}`),

  createStandalone: (name: string, steps: Step[]) =>
    api.post<Standalone>(`${BASE}/standalone`, { name, steps }),
  updateStandalone: (id: string, changes: { name?: string; steps?: Step[] }) =>
    api.patch<Standalone>(`${BASE}/standalone/${id}`, changes),
  deleteStandalone: (id: string) => api.delete(`${BASE}/standalone/${id}`),

  getDay: (day: string) => api.get<Day>(`${BASE}/days/${day}`),
  addBlock: (day: string, sourceType: SourceType, sourceId: string) =>
    api.post<Block>(`${BASE}/days/${day}/blocks`, { sourceType, sourceId }),
  updateBlock: (id: string, progress: BlockProgress) =>
    api.patch<Block>(`${BASE}/blocks/${id}`, progress),
  deleteBlock: (id: string) => api.delete(`${BASE}/blocks/${id}`),

  getHistory: (month: string) => api.get<MonthHistory>(`${BASE}/history`, { month }),
};
