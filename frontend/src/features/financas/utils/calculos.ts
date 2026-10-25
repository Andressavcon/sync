import { addMonths, differenceInCalendarDays, format, isBefore, parseISO, startOfMonth } from "date-fns";
import type { DadosFinancas } from "../types";
import { cicloDe, dentroDoCiclo, type Ciclo } from "./ciclo";
import { valorContaMes, vencimentoConta } from "./contas";
import { totalFatura, vencimentoDe } from "./faturas";

export interface Disponivel {
  ciclo: Ciclo;
  salario: number;
  contasFixas: number;
  faturas: number;
  avulsos: number;
  guardado: number;
  extras: number;
  total: number;
  semanas: number;
  porSemana: number;
}

const soma = <T,>(lista: T[], valor: (item: T) => number) => lista.reduce((t, i) => t + valor(i), 0);

function mesesEntre(inicio: Date, fim: Date): string[] {
  const meses: string[] = [];
  let m = startOfMonth(inicio);
  while (!isBefore(fim, m)) {
    meses.push(format(m, "yyyy-MM"));
    m = addMonths(m, 1);
  }
  return meses;
}

/**
 * Seção 9.6:
 * disponível = salário − contas fixas do ciclo − faturas que vencem no ciclo
 *              − pix/boletos avulsos − guardado na caixinha (+ receitas extras contabilizadas)
 */
export function calcularDisponivel(d: DadosFinancas, hoje: Date): Disponivel {
  const ciclo = cicloDe(hoje, d.salario.dia);
  const meses = mesesEntre(ciclo.inicio, ciclo.fim);

  let contasFixas = 0;
  for (const conta of d.contasFixas) {
    for (const mes of meses) {
      if (dentroDoCiclo(vencimentoConta(conta, mes), ciclo)) contasFixas += valorContaMes(d, conta, mes);
    }
  }

  let faturas = 0;
  for (const cartao of d.cartoes) {
    for (const mes of meses) {
      if (dentroDoCiclo(vencimentoDe(cartao, mes), ciclo)) faturas += totalFatura(d.lancamentos, cartao.id, mes);
    }
  }

  const avulsos = soma(
    d.lancamentos.filter(
      (l) => l.tipo === "despesa" && l.meio.tipo !== "cartao" && dentroDoCiclo(parseISO(l.data), ciclo)
    ),
    (l) => l.valor
  );

  const extras = soma(
    d.lancamentos.filter((l) => l.tipo === "receita" && l.contabilizar && dentroDoCiclo(parseISO(l.data), ciclo)),
    (l) => l.valor
  );

  // guardar reduz o disponível; retirar devolve
  const guardado = soma(
    d.movimentos.filter((m) => dentroDoCiclo(parseISO(m.data), ciclo)),
    (m) => (m.tipo === "guardar" ? m.valor : -m.valor)
  );

  const total = d.salario.valor - contasFixas - faturas - avulsos - guardado + extras;

  // disponível da semana = o que resta do ciclo ÷ semanas que faltam (incluindo a atual)
  const dias = Math.max(1, differenceInCalendarDays(ciclo.fim, hoje));
  const semanas = Math.max(1, Math.ceil(dias / 7));

  return {
    ciclo,
    salario: d.salario.valor,
    contasFixas,
    faturas,
    avulsos,
    guardado,
    extras,
    total,
    semanas,
    porSemana: total / semanas,
  };
}

/** Receitas, despesas e saldo do mês. Pagar fatura e guardar na caixinha não entram. */
export function resumoDoMes(d: DadosFinancas, ref: Date) {
  const mes = format(ref, "yyyy-MM");
  const doMes = (data: string) => data.startsWith(mes);

  const receitas =
    d.salario.valor + soma(d.lancamentos.filter((l) => l.tipo === "receita" && doMes(l.data)), (l) => l.valor);
  const despesas =
    soma(d.lancamentos.filter((l) => l.tipo === "despesa" && doMes(l.data)), (l) => l.valor) +
    soma(d.contasFixas, (c) => valorContaMes(d, c, mes));

  return { receitas, despesas, saldo: receitas - despesas };
}
