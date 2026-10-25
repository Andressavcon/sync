import { format, getDate, getDay, parseISO } from "date-fns";
import type { Recurrence } from "@/data/repositories/kanbanRepository";
import { WEEKDAY_LABELS, type RepeatSettings } from "../types";

/** "17:00:00" -> "17:00" */
export function shortTime(time: string): string {
  return time.slice(0, 5);
}

/** Countdown text from the backend's daysUntil */
export function countdown(daysUntil: number): string {
  if (daysUntil === 0) return "hoje";
  if (daysUntil === 1) return "amanhã";
  if (daysUntil > 1) return `em ${daysUntil} dias`;
  return daysUntil === -1 ? "ontem" : `há ${-daysUntil} dias`;
}

/** Backend weekday (Monday = 0) of a yyyy-MM-dd date; date-fns uses Sunday = 0 */
export function backendWeekday(date: string): number {
  return (getDay(parseISO(date)) + 6) % 7;
}

/** Repeat defaults based on the card date: same weekday / same day of the month */
export function defaultRepeat(date: string): RepeatSettings {
  return {
    frequency: "weekly",
    weekdays: [backendWeekday(date)],
    monthDay: getDate(parseISO(date)),
    endDate: "",
  };
}

export function isRepeatValid(repeat: RepeatSettings): boolean {
  if (repeat.frequency === "weekly") return repeat.weekdays.length > 0;
  if (repeat.frequency === "monthly") return repeat.monthDay >= 1 && repeat.monthDay <= 31;
  return true;
}

/** "Toda semana: seg, qua, sex · até 30/11/2026" */
export function describeRecurrence(rule: Recurrence): string {
  let text = "Todo dia";
  if (rule.frequency === "weekly") {
    text = `Toda semana: ${rule.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")}`;
  } else if (rule.frequency === "monthly") {
    text = `Todo mês, dia ${rule.monthDay}`;
  }
  if (rule.endDate) text += ` · até ${format(parseISO(rule.endDate), "dd/MM/yyyy")}`;
  return text;
}
