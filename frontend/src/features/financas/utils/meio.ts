import type { Cartao, MeioPagamento } from "../types";

/** Valor usado nos <select>: "cartao:<id>", "pix" ou "boleto". */
export function meioParaValor(m: MeioPagamento): string {
  return m.tipo === "cartao" ? `cartao:${m.cartaoId}` : m.tipo;
}

export function meioRotulo(m: MeioPagamento, cartoes: Cartao[]): string {
  if (m.tipo === "pix") return "Pix";
  if (m.tipo === "boleto") return "Boleto";
  return cartoes.find((c) => c.id === m.cartaoId)?.nome ?? "Cartão";
}
