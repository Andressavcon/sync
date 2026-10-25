import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newId } from "@/lib/ids";
import { gerarMock } from "../mock";
import type { KanbanCard, Tag } from "../types";

interface KanbanState {
  cards: KanbanCard[];
  tags: Tag[];

  addCard: (d: Omit<KanbanCard, "id" | "criadoEm" | "concluidoEm">) => void;
  updateCard: (id: string, patch: Partial<Omit<KanbanCard, "id">>) => void;
  removeCard: (id: string) => void;
  /** Arrastar para outro dia: muda a data e mantém a hora. Se estava feito, reabre como pendente. */
  moverParaDia: (id: string, data: string) => void;

  /** Cria a tag (ou devolve a existente com o mesmo nome) */
  addTag: (nome: string) => Tag;
}

const mock = gerarMock();

// Mock: persistido no navegador. Depois isto passa a vir dos repositories (Dexie / API).
export const useKanban = create<KanbanState>()(
  persist(
    (set, get) => ({
      cards: mock.cards,
      tags: mock.tags,

      addCard: (d) =>
        set((s) => ({
          cards: [
            ...s.cards,
            {
              ...d,
              id: newId(),
              criadoEm: new Date().toISOString(),
              concluidoEm: d.status === "feito" ? new Date().toISOString() : undefined,
            },
          ],
        })),

      updateCard: (id, patch) =>
        set((s) => ({
          cards: s.cards.map((c) => {
            if (c.id !== id) return c;
            const next = { ...c, ...patch };
            // guarda a data/hora em que foi marcado como feito (seção 4.4)
            if (patch.status && patch.status !== c.status) {
              next.concluidoEm = patch.status === "feito" ? new Date().toISOString() : undefined;
            }
            return next;
          }),
        })),

      removeCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),

      moverParaDia: (id, data) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === id
              ? {
                  ...c,
                  dataEntrega: data,
                  status: c.status === "feito" ? "pendente" : c.status,
                  concluidoEm: undefined,
                }
              : c
          ),
        })),

      addTag: (nome) => {
        const existente = get().tags.find((t) => t.nome.toLowerCase() === nome.toLowerCase());
        if (existente) return existente;
        const tag: Tag = { id: newId(), nome };
        set((s) => ({ tags: [...s.tags, tag] }));
        return tag;
      },
    }),
    { name: "sync:kanban" }
  )
);
