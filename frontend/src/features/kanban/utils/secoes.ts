import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfWeek,
} from "date-fns";
import type { KanbanCard } from "../types";

/** 1 = segunda. Depois isto pode virar preferência em Configurações. */
export const WEEK_STARTS_ON = 1 as const;

export interface Secoes {
  /** Cards da semana atual, por dia (chave yyyy-MM-dd) */
  dias: Record<string, KanbanCard[]>;
  finalizados: KanbanCard[];
  atrasados: KanbanCard[];
  futuros: KanbanCard[];
}

export function diasDaSemana(ref: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON }),
  });
}

export function dataHora(card: KanbanCard): Date {
  return parseISO(`${card.dataEntrega}T${card.horaEntrega}`);
}

/** Atrasado: data e hora já passaram e o status não é feito (seção 4.4). */
export function estaAtrasado(card: KanbanCard, now: Date): boolean {
  return card.status !== "feito" && isBefore(dataHora(card), now);
}

export function contagemRegressiva(card: KanbanCard, now: Date): string {
  const dias = differenceInCalendarDays(parseISO(card.dataEntrega), now);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias > 1) return `em ${dias} dias`;
  return dias === -1 ? "ontem" : `há ${-dias} dias`;
}

const porHora = (a: KanbanCard, b: KanbanCard) => a.horaEntrega.localeCompare(b.horaEntrega);
const porDataHora = (a: KanbanCard, b: KanbanCard) =>
  dataHora(a).getTime() - dataHora(b).getTime();

/** Tabela da seção 4.8. */
export function calcularSecoes(cards: KanbanCard[], hoje: Date): Secoes {
  const inicio = startOfWeek(hoje, { weekStartsOn: WEEK_STARTS_ON });
  const fim = endOfWeek(hoje, { weekStartsOn: WEEK_STARTS_ON });

  const dias: Record<string, KanbanCard[]> = {};
  for (const dia of diasDaSemana(hoje)) dias[format(dia, "yyyy-MM-dd")] = [];

  const finalizados: KanbanCard[] = [];
  const atrasados: KanbanCard[] = [];
  const futuros: KanbanCard[] = [];

  for (const card of cards) {
    if (card.status === "feito") {
      finalizados.push(card);
      continue;
    }
    const data = parseISO(card.dataEntrega);
    if (isBefore(data, inicio)) atrasados.push(card);
    else if (isAfter(data, fim)) futuros.push(card);
    else (dias[card.dataEntrega] ??= []).push(card);
  }

  for (const lista of Object.values(dias)) lista.sort(porHora);
  atrasados.sort(porDataHora);
  futuros.sort(porDataHora);
  finalizados.sort((a, b) => (b.concluidoEm ?? "").localeCompare(a.concluidoEm ?? ""));

  return { dias, finalizados, atrasados, futuros };
}
