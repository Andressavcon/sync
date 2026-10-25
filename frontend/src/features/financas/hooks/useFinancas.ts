import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import { newId } from "@/lib/ids";
import { gerarMock } from "../mock";
import { valorContaMes } from "../utils/contas";
import { gerarParcelas } from "../utils/parcelas";
import type {
  Cartao,
  ContaFixa,
  ContaFixaMes,
  DadosFinancas,
  Escopo,
  Fatura,
  Lancamento,
  Salario,
} from "../types";

type PatchLancamento = Partial<
  Pick<Lancamento, "titulo" | "valor" | "data" | "tipo" | "meio" | "faturaMes" | "contabilizar">
>;

interface FinancasState extends DadosFinancas {
  // cartões e faturas
  addCartao: (d: Omit<Cartao, "id" | "arquivado">) => void;
  updateCartao: (id: string, patch: Partial<Omit<Cartao, "id">>) => void;
  /** Esconde o cartão mantendo o histórico */
  arquivarCartao: (id: string) => void;
  removeCartao: (id: string) => void;
  confirmarFechamento: (cartaoId: string, mes: string, fechamento: string) => void;
  /** Pagar a fatura não é despesa nova: só marca como quitada */
  marcarFaturaPaga: (cartaoId: string, mes: string, paga: boolean) => void;

  // lançamentos
  addLancamento: (d: Omit<Lancamento, "id" | "parcela">) => void;
  addCompraParcelada: (d: {
    titulo: string;
    valorParcela: number;
    parcelas: number;
    data: string;
    cartaoId: string;
    faturaMes: string;
  }) => void;
  updateLancamento: (id: string, patch: PatchLancamento, escopo: Escopo) => void;
  removeLancamento: (id: string, escopo: Escopo) => void;

  // contas fixas
  addContaFixa: (d: Omit<ContaFixa, "id">) => void;
  updateContaFixa: (id: string, patch: Partial<Omit<ContaFixa, "id">>) => void;
  removeContaFixa: (id: string) => void;
  definirValorMes: (contaId: string, mes: string, valor: number) => void;
  alternarPago: (contaId: string, mes: string) => void;

  // caixinha
  addPote: (nome: string) => void;
  renamePote: (id: string, nome: string) => void;
  removePote: (id: string) => void;
  guardar: (poteId: string, valor: number) => void;
  retirar: (poteId: string, valor: number) => void;
  /** Correção direta do valor: não mexe no disponível */
  ajustar: (poteId: string, valor: number) => void;

  setSalario: (s: Salario) => void;
}

function upsertFatura(faturas: Fatura[], cartaoId: string, mes: string, patch: Partial<Fatura>): Fatura[] {
  const existe = faturas.some((f) => f.cartaoId === cartaoId && f.mes === mes);
  if (existe) {
    return faturas.map((f) => (f.cartaoId === cartaoId && f.mes === mes ? { ...f, ...patch } : f));
  }
  return [...faturas, { id: newId(), cartaoId, mes, confirmada: false, paga: false, ...patch }];
}

function upsertOcorrencia(
  s: DadosFinancas,
  contaId: string,
  mes: string,
  patch: Partial<ContaFixaMes>
): ContaFixaMes[] {
  const conta = s.contasFixas.find((c) => c.id === contaId);
  if (!conta) return s.contasMes;
  const existe = s.contasMes.some((o) => o.contaId === contaId && o.mes === mes);
  if (existe) {
    return s.contasMes.map((o) => (o.contaId === contaId && o.mes === mes ? { ...o, ...patch } : o));
  }
  return [...s.contasMes, { contaId, mes, valor: valorContaMes(s, conta, mes), pago: false, ...patch }];
}

const hojeISO = () => format(new Date(), "yyyy-MM-dd");

// Mock: persistido no navegador. Depois isto passa a vir dos repositories (Dexie / API).
export const useFinancas = create<FinancasState>()(
  persist(
    (set) => ({
      ...gerarMock(),

      addCartao: (d) => set((s) => ({ cartoes: [...s.cartoes, { ...d, id: newId(), arquivado: false }] })),
      updateCartao: (id, patch) =>
        set((s) => ({ cartoes: s.cartoes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      arquivarCartao: (id) =>
        set((s) => ({ cartoes: s.cartoes.map((c) => (c.id === id ? { ...c, arquivado: true } : c)) })),
      removeCartao: (id) =>
        set((s) => ({
          cartoes: s.cartoes.filter((c) => c.id !== id),
          faturas: s.faturas.filter((f) => f.cartaoId !== id),
        })),
      confirmarFechamento: (cartaoId, mes, fechamento) =>
        set((s) => ({ faturas: upsertFatura(s.faturas, cartaoId, mes, { fechamento, confirmada: true }) })),
      marcarFaturaPaga: (cartaoId, mes, paga) =>
        set((s) => ({
          faturas: upsertFatura(s.faturas, cartaoId, mes, {
            paga,
            pagaEm: paga ? new Date().toISOString() : undefined,
          }),
        })),

      addLancamento: (d) => set((s) => ({ lancamentos: [...s.lancamentos, { ...d, id: newId() }] })),
      addCompraParcelada: (d) =>
        set((s) => ({
          lancamentos: [...s.lancamentos, ...gerarParcelas(d).map((p) => ({ ...p, id: newId() }))],
        })),

      updateLancamento: (id, patch, escopo) =>
        set((s) => {
          const alvo = s.lancamentos.find((l) => l.id === id);
          if (!alvo) return s;
          const grupo = alvo.parcela;
          const nasProximas = (l: Lancamento) =>
            escopo === "proximas" &&
            !!grupo &&
            l.parcela?.grupoId === grupo.grupoId &&
            l.parcela.numero >= grupo.numero;
          return {
            lancamentos: s.lancamentos.map((l) => {
              if (l.id === id) return { ...l, ...patch };
              // nas próximas parcelas só título e valor acompanham
              if (nasProximas(l)) {
                return {
                  ...l,
                  ...(patch.titulo !== undefined ? { titulo: patch.titulo } : {}),
                  ...(patch.valor !== undefined ? { valor: patch.valor } : {}),
                };
              }
              return l;
            }),
          };
        }),

      removeLancamento: (id, escopo) =>
        set((s) => {
          const alvo = s.lancamentos.find((l) => l.id === id);
          if (!alvo) return s;
          const grupo = alvo.parcela;
          return {
            lancamentos: s.lancamentos.filter((l) => {
              if (l.id === id) return false;
              const proxima =
                escopo === "proximas" &&
                !!grupo &&
                l.parcela?.grupoId === grupo.grupoId &&
                l.parcela.numero >= grupo.numero;
              return !proxima;
            }),
          };
        }),

      addContaFixa: (d) => set((s) => ({ contasFixas: [...s.contasFixas, { ...d, id: newId() }] })),
      updateContaFixa: (id, patch) =>
        set((s) => ({ contasFixas: s.contasFixas.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeContaFixa: (id) =>
        set((s) => ({
          contasFixas: s.contasFixas.filter((c) => c.id !== id),
          contasMes: s.contasMes.filter((o) => o.contaId !== id),
        })),
      definirValorMes: (contaId, mes, valor) =>
        set((s) => ({ contasMes: upsertOcorrencia(s, contaId, mes, { valor }) })),
      alternarPago: (contaId, mes) =>
        set((s) => {
          const atual = s.contasMes.find((o) => o.contaId === contaId && o.mes === mes)?.pago ?? false;
          return {
            contasMes: upsertOcorrencia(s, contaId, mes, {
              pago: !atual,
              pagoEm: !atual ? new Date().toISOString() : undefined,
            }),
          };
        }),

      addPote: (nome) => set((s) => ({ potes: [...s.potes, { id: newId(), nome, valor: 0 }] })),
      renamePote: (id, nome) =>
        set((s) => ({ potes: s.potes.map((p) => (p.id === id ? { ...p, nome } : p)) })),
      removePote: (id) =>
        set((s) => ({
          potes: s.potes.filter((p) => p.id !== id),
          movimentos: s.movimentos.filter((m) => m.poteId !== id),
        })),
      guardar: (poteId, valor) =>
        set((s) => ({
          potes: s.potes.map((p) => (p.id === poteId ? { ...p, valor: p.valor + valor } : p)),
          movimentos: [...s.movimentos, { id: newId(), poteId, tipo: "guardar", valor, data: hojeISO() }],
        })),
      retirar: (poteId, valor) =>
        set((s) => ({
          potes: s.potes.map((p) => (p.id === poteId ? { ...p, valor: Math.max(0, p.valor - valor) } : p)),
          movimentos: [...s.movimentos, { id: newId(), poteId, tipo: "retirar", valor, data: hojeISO() }],
        })),
      ajustar: (poteId, valor) =>
        set((s) => ({ potes: s.potes.map((p) => (p.id === poteId ? { ...p, valor } : p)) })),

      setSalario: (salario) => set({ salario }),
    }),
    { name: "sync:financas" }
  )
);
