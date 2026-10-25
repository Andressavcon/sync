import type { CardStatus, Frequency } from "@/data/repositories/kanbanRepository";

/** Which sections outside the week are visible (section 4.2 filters) */
export interface Visibility {
  overdue: boolean;
  upcoming: boolean;
  done: boolean;
}

export const STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Feito" },
];

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Todo dia" },
  { value: "weekly", label: "Toda semana" },
  { value: "monthly", label: "Todo mês" },
];

/** Index = backend weekday (Monday = 0) */
export const WEEKDAY_LABELS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

/** Repeat settings while creating a recurring card */
export interface RepeatSettings {
  frequency: Frequency;
  weekdays: number[];
  monthDay: number;
  endDate: string; // empty = repeats forever
}

/** In-app reminder of a card (section 6): null = off, 0 = on the day */
export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Sem lembrete" },
  { value: 0, label: "No dia" },
  { value: 1, label: "1 dia antes" },
  { value: 2, label: "2 dias antes" },
  { value: 3, label: "3 dias antes" },
  { value: 7, label: "1 semana antes" },
  { value: 14, label: "2 semanas antes" },
  { value: 30, label: "1 mês antes" },
];
