import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newId } from "@/lib/ids";
import { gerarMock } from "../mock";
import { resolverOrigem } from "../utils/origem";
import type { BlocoDia, Origem, Programa, TreinoAvulso } from "../types";

type Dias = Record<string, BlocoDia[]>;

interface TreinosState {
  programas: Programa[];
  avulsos: TreinoAvulso[];
  /** Blocos de cada dia, por data (yyyy-MM-dd) */
  dias: Dias;

  adicionarBloco: (data: string, origem: Origem, origemId: string) => void;
  removerBloco: (data: string, blocoId: string) => void;
  /** Marca/desmarca o check manual do bloco */
  alternarConcluido: (data: string, blocoId: string) => void;
  /** Guarda onde o cronômetro parou; o bloco fica "em andamento" */
  salvarProgresso: (data: string, blocoId: string, passoIndex: number, restanteMs?: number) => void;
  concluirBloco: (data: string, blocoId: string) => void;
}

function mapBloco(dias: Dias, data: string, id: string, fn: (b: BlocoDia) => BlocoDia): Dias {
  return { ...dias, [data]: (dias[data] ?? []).map((b) => (b.id === id ? fn(b) : b)) };
}

const mock = gerarMock();

// Mock: persistido no navegador. Depois isto passa a vir dos repositories (Dexie / API).
export const useTreinos = create<TreinosState>()(
  persist(
    (set) => ({
      programas: mock.programas,
      avulsos: mock.avulsos,
      dias: mock.dias,

      adicionarBloco: (data, origem, origemId) =>
        set((s) => {
          const o = resolverOrigem(s.programas, s.avulsos, origem, origemId);
          if (!o) return s;
          const bloco: BlocoDia = {
            id: newId(),
            origem,
            origemId,
            titulo: o.titulo,
            etapas: structuredClone(o.etapas),
            estado: "nao_iniciado",
            passoIndex: 0,
          };
          return { dias: { ...s.dias, [data]: [...(s.dias[data] ?? []), bloco] } };
        }),

      removerBloco: (data, blocoId) =>
        set((s) => ({ dias: { ...s.dias, [data]: (s.dias[data] ?? []).filter((b) => b.id !== blocoId) } })),

      alternarConcluido: (data, blocoId) =>
        set((s) => ({
          dias: mapBloco(s.dias, data, blocoId, (b) =>
            b.estado === "concluido"
              ? { ...b, estado: "nao_iniciado", passoIndex: 0, restanteMs: undefined }
              : { ...b, estado: "concluido", restanteMs: undefined }
          ),
        })),

      salvarProgresso: (data, blocoId, passoIndex, restanteMs) =>
        set((s) => ({
          dias: mapBloco(s.dias, data, blocoId, (b) =>
            b.estado === "concluido" ? b : { ...b, estado: "em_andamento", passoIndex, restanteMs }
          ),
        })),

      concluirBloco: (data, blocoId) =>
        set((s) => ({
          dias: mapBloco(s.dias, data, blocoId, (b) => ({ ...b, estado: "concluido", restanteMs: undefined })),
        })),
    }),
    { name: "sync:treinos" }
  )
);
