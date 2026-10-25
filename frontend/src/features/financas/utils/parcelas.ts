import { addMonths, format, parseISO } from "date-fns";
import { newId } from "@/lib/ids";
import type { Lancamento } from "../types";

interface Entrada {
  titulo: string;
  valorParcela: number;
  parcelas: number;
  data: string; // data da compra, yyyy-MM-dd
  cartaoId: string;
  /** Fatura (mês do vencimento) da primeira parcela, yyyy-MM */
  faturaMes: string;
}

/** Cada parcela cai numa fatura futura, um mês depois da anterior. */
export function gerarParcelas(e: Entrada): Omit<Lancamento, "id">[] {
  const grupoId = newId();
  return Array.from({ length: e.parcelas }, (_, i) => ({
    tipo: "despesa" as const,
    titulo: e.titulo,
    valor: e.valorParcela,
    data: format(addMonths(parseISO(e.data), i), "yyyy-MM-dd"),
    meio: { tipo: "cartao" as const, cartaoId: e.cartaoId },
    faturaMes: format(addMonths(parseISO(`${e.faturaMes}-01`), i), "yyyy-MM"),
    parcela: { grupoId, numero: i + 1, total: e.parcelas },
  }));
}
