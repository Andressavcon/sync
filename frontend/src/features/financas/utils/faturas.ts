import { addMonths, format, isBefore, parseISO, startOfDay } from "date-fns";
import type { Cartao, Fatura, Lancamento } from "../types";
import { dataNoMes } from "./datas";

export const mesDe = (d: Date): string => format(d, "yyyy-MM");
export const inicioDoMes = (mes: string): Date => parseISO(`${mes}-01`);

export function vencimentoDe(cartao: Cartao, mes: string): Date {
  return dataNoMes(inicioDoMes(mes), cartao.diaVencimento);
}

/** Se o fechamento é antes do vencimento, cai no mesmo mês; senão, no mês anterior. */
export function fechamentoPadrao(cartao: Cartao, mes: string): Date {
  const base =
    cartao.diaFechamento < cartao.diaVencimento ? inicioDoMes(mes) : addMonths(inicioDoMes(mes), -1);
  return dataNoMes(base, cartao.diaFechamento);
}

export function faturaDe(faturas: Fatura[], cartaoId: string, mes: string): Fatura | undefined {
  return faturas.find((f) => f.cartaoId === cartaoId && f.mes === mes);
}

export function fechamentoDe(cartao: Cartao, mes: string, faturas: Fatura[]): Date {
  const f = faturaDe(faturas, cartao.id, mes);
  return f?.fechamento ? parseISO(f.fechamento) : fechamentoPadrao(cartao, mes);
}

/** Compra depois do fechamento entra na fatura seguinte (seção 9.4). */
export function sugerirFatura(cartao: Cartao, compra: Date, faturas: Fatura[]): string {
  const dia = startOfDay(compra);
  for (let k = -1; k <= 2; k++) {
    const mes = mesDe(addMonths(dia, k));
    if (!isBefore(fechamentoDe(cartao, mes, faturas), dia)) return mes;
  }
  return mesDe(addMonths(dia, 2));
}

export function totalFatura(lancamentos: Lancamento[], cartaoId: string, mes: string): number {
  return lancamentos
    .filter(
      (l) =>
        l.tipo === "despesa" &&
        l.meio.tipo === "cartao" &&
        l.meio.cartaoId === cartaoId &&
        l.faturaMes === mes
    )
    .reduce((t, l) => t + l.valor, 0);
}

/** Quanto já está comprometido nas faturas depois da atual. */
export function comprometidoFuturo(lancamentos: Lancamento[], cartaoId: string, mesAtual: string): number {
  return lancamentos
    .filter(
      (l) =>
        l.tipo === "despesa" &&
        l.meio.tipo === "cartao" &&
        l.meio.cartaoId === cartaoId &&
        !!l.faturaMes &&
        l.faturaMes > mesAtual
    )
    .reduce((t, l) => t + l.valor, 0);
}
