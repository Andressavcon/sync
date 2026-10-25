import { addMonths, format, lastDayOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/** "2026-11" (months are always yyyy-MM, like the backend) */
export const monthOf = (date: Date) => format(date, "yyyy-MM");
export const currentMonth = () => monthOf(new Date());
export const shiftMonth = (month: string, count: number) =>
  monthOf(addMonths(parseISO(`${month}-01`), count));

/** "outubro de 2026" */
export const monthLabel = (month: string) =>
  format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: ptBR });

/** "nov/2026" */
export const shortMonthLabel = (month: string) =>
  format(parseISO(`${month}-01`), "MMM/yyyy", { locale: ptBR });

/** First and last day of a month, as yyyy-MM-dd */
export function monthBounds(month: string): [string, string] {
  const first = parseISO(`${month}-01`);
  return [format(first, "yyyy-MM-dd"), format(lastDayOfMonth(first), "yyyy-MM-dd")];
}

/** "05/11" */
export const dayMonth = (date: string) => format(parseISO(date), "dd/MM");

export const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
