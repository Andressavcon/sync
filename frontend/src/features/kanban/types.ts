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
