import { api } from "@/data/api";

// ---------- Types (mirror the backend schemas in app/modules/kanban/schemas.py) ----------

export type CardStatus = "pending" | "in_progress" | "done";
export type Frequency = "daily" | "weekly" | "monthly";
/** Editing/deleting an occurrence of a recurring card: only this one, or this and the next ones */
export type Scope = "this" | "following";

export interface Tag {
  id: string;
  name: string;
}

export interface Card {
  id: string;
  title: string;
  content: string;
  status: CardStatus;
  dueDate: string; // yyyy-MM-dd
  dueTime: string; // HH:mm:ss
  createdAt: string;
  completedAt: string | null;
  tags: Tag[];
  recurrenceId: string | null;
  occurrenceDate: string | null;
}

export interface BoardCard {
  card: Card;
  isLate: boolean;
  /** 0 = today, 1 = tomorrow, negative = days ago */
  daysUntil: number;
}

export interface BoardDay {
  date: string;
  isToday: boolean;
  cards: BoardCard[];
}

export interface Board {
  today: string;
  weekStart: string;
  weekEnd: string;
  days: BoardDay[];
  overdue: BoardCard[];
  upcoming: BoardCard[];
  done: BoardCard[];
}

export interface CardInput {
  title: string;
  content: string;
  status: CardStatus;
  dueDate: string;
  dueTime: string;
  tagIds: string[];
}

export interface Recurrence {
  id: string;
  title: string;
  content: string;
  dueTime: string;
  tags: Tag[];
  frequency: Frequency;
  weekdays: number[]; // Monday = 0 ... Sunday = 6
  monthDay: number | null;
  startDate: string;
  endDate: string | null;
}

export interface RecurrenceInput {
  title: string;
  content: string;
  dueTime: string;
  tagIds: string[];
  frequency: Frequency;
  weekdays: number[];
  monthDay: number | null;
  startDate: string;
  endDate: string | null;
}

// ---------- Calls ----------

export const kanbanRepository = {
  getBoard: (tagIds: string[] = []) => api.get<Board>("/api/kanban/board", { tagIds }),

  listTags: () => api.get<Tag[]>("/api/tags"),
  createTag: (name: string) => api.post<Tag>("/api/tags", { name }),
  renameTag: (id: string, name: string) => api.patch<Tag>(`/api/tags/${id}`, { name }),
  deleteTag: (id: string) => api.delete(`/api/tags/${id}`),

  createCard: (input: CardInput) => api.post<Card>("/api/cards", input),
  updateCard: (id: string, changes: Partial<CardInput>, scope: Scope = "this") =>
    api.patch<Card>(`/api/cards/${id}`, changes, { scope }),
  deleteCard: (id: string, scope: Scope = "this") => api.delete(`/api/cards/${id}`, { scope }),

  getRecurrence: (id: string) => api.get<Recurrence>(`/api/recurrences/${id}`),
  createRecurrence: (input: RecurrenceInput) => api.post<Recurrence>("/api/recurrences", input),
  deleteRecurrence: (id: string) => api.delete(`/api/recurrences/${id}`),
};
