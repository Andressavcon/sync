import { addMonths, isBefore, startOfDay, subMonths } from "date-fns";
import { dataNoMes } from "./datas";

/** Do dia do salário até o próximo. `fim` é exclusivo. */
export interface Ciclo {
  inicio: Date;
  fim: Date;
}

export function cicloDe(hoje: Date, diaSalario: number): Ciclo {
  const dia = startOfDay(hoje);
  const esteMes = dataNoMes(dia, diaSalario);
  const inicio = isBefore(dia, esteMes) ? dataNoMes(subMonths(dia, 1), diaSalario) : esteMes;
  const fim = dataNoMes(addMonths(inicio, 1), diaSalario);
  return { inicio, fim };
}

export function dentroDoCiclo(data: Date, c: Ciclo): boolean {
  return !isBefore(data, c.inicio) && isBefore(data, c.fim);
}
