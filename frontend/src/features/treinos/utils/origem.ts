import type { Etapa, Origem, Programa, TreinoAvulso } from "../types";

/** Acha o título e as etapas de uma sessão de programa ou de um treino avulso. */
export function resolverOrigem(
  programas: Programa[],
  avulsos: TreinoAvulso[],
  origem: Origem,
  origemId: string
): { titulo: string; etapas: Etapa[] } | null {
  if (origem === "avulso") {
    const a = avulsos.find((x) => x.id === origemId);
    return a ? { titulo: a.nome, etapas: a.etapas } : null;
  }
  for (const p of programas) {
    const s = p.sessoes.find((x) => x.id === origemId);
    if (s) return { titulo: `${p.nome} · Dia ${s.numero}`, etapas: s.etapas };
  }
  return null;
}
