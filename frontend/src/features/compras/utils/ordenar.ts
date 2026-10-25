import type { Item } from "../types";

/** Itens comprados vão para o fim, mantendo a ordem original (seção 8.3). */
export function ordenarPorComprado(itens: Item[]): Item[] {
  return [...itens.filter((i) => !i.comprado), ...itens.filter((i) => i.comprado)];
}
