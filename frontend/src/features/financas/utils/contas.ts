import { parseISO } from "date-fns";
import type { ContaFixa, DadosFinancas } from "../types";
import { dataNoMes } from "./datas";

export function vencimentoConta(conta: ContaFixa, mes: string): Date {
  return dataNoMes(parseISO(`${mes}-01`), conta.diaVencimento);
}

/** Valor do mês: o editado; senão o do último mês registrado; senão o cadastrado. */
export function valorContaMes(
  dados: Pick<DadosFinancas, "contasMes">,
  conta: ContaFixa,
  mes: string
): number {
  const exata = dados.contasMes.find((o) => o.contaId === conta.id && o.mes === mes);
  if (exata) return exata.valor;
  const anterior = dados.contasMes
    .filter((o) => o.contaId === conta.id && o.mes < mes)
    .sort((a, b) => b.mes.localeCompare(a.mes))[0];
  return anterior?.valor ?? conta.valor;
}

export function pagaNoMes(dados: Pick<DadosFinancas, "contasMes">, contaId: string, mes: string): boolean {
  return dados.contasMes.find((o) => o.contaId === contaId && o.mes === mes)?.pago ?? false;
}
