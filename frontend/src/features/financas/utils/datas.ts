import { getDaysInMonth } from "date-fns";

/** Dia `dia` do mês de `base`, ajustado para meses curtos (dia 31 em fevereiro vira 28). */
export function dataNoMes(base: Date, dia: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), Math.min(dia, getDaysInMonth(base)));
}
