import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newId } from "@/lib/ids";
import { MOCK_CATEGORIAS, MOCK_ITENS } from "../mock";
import type { Categoria, Gasto, Item, ListaArquivada } from "../types";

const DIAS_ARQUIVO = 90; // seção 8.5
const DIA_MS = 24 * 60 * 60 * 1000;

interface ComprasState {
  categorias: Categoria[];
  itens: Item[];
  arquivadas: ListaArquivada[];
  gastos: Gasto[];

  addItem: (d: Pick<Item, "nome" | "quantidade" | "categoriaId" | "importante">) => void;
  updateItem: (id: string, patch: Partial<Omit<Item, "id">>) => void;
  removeItem: (id: string) => void;
  toggleComprado: (id: string) => void;

  addCategoria: (nome: string) => void;
  renameCategoria: (id: string, nome: string) => void;
  /** Remove a categoria e os itens dela */
  removeCategoria: (id: string) => void;

  registrarGasto: (d: Omit<Gasto, "id">) => void;
  /** Arquiva a lista; itens não marcados passam para a nova lista */
  concluirLista: () => void;
}

// Mock: persistido no navegador. Depois isto passa a vir dos repositories (Dexie / API).
export const useCompras = create<ComprasState>()(
  persist(
    (set) => ({
      categorias: MOCK_CATEGORIAS,
      itens: MOCK_ITENS,
      arquivadas: [],
      gastos: [],

      addItem: (d) =>
        set((s) => ({ itens: [...s.itens, { ...d, id: newId(), comprado: false }] })),
      updateItem: (id, patch) =>
        set((s) => ({ itens: s.itens.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeItem: (id) => set((s) => ({ itens: s.itens.filter((i) => i.id !== id) })),
      toggleComprado: (id) =>
        set((s) => ({
          itens: s.itens.map((i) => (i.id === id ? { ...i, comprado: !i.comprado } : i)),
        })),

      addCategoria: (nome) =>
        set((s) => ({ categorias: [...s.categorias, { id: newId(), nome }] })),
      renameCategoria: (id, nome) =>
        set((s) => ({ categorias: s.categorias.map((c) => (c.id === id ? { ...c, nome } : c)) })),
      removeCategoria: (id) =>
        set((s) => ({
          categorias: s.categorias.filter((c) => c.id !== id),
          itens: s.itens.filter((i) => i.categoriaId !== id),
        })),

      registrarGasto: (d) => set((s) => ({ gastos: [{ ...d, id: newId() }, ...s.gastos] })),

      concluirLista: () =>
        set((s) => {
          const arquivada: ListaArquivada = {
            id: newId(),
            concluidaEm: new Date().toISOString(),
            itens: s.itens,
          };
          const recentes = s.arquivadas.filter(
            (a) => Date.now() - new Date(a.concluidaEm).getTime() < DIAS_ARQUIVO * DIA_MS
          );
          return {
            arquivadas: [arquivada, ...recentes],
            itens: s.itens.filter((i) => !i.comprado),
          };
        }),
    }),
    { name: "sync:compras" }
  )
);
