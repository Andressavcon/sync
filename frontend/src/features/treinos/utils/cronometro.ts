import type { Passo } from "./passos";

/**
 * Máquina de estados do cronômetro (função pura, sem React).
 * O tempo é calculado pelo horário de término, não contando segundo a segundo,
 * então não erra com a tela bloqueada ou o app em segundo plano.
 */
export interface EstadoCrono {
  idx: number;
  terminaEm: number | null; // epoch ms; só em passos cronometrados rodando
  pausadoMs: number | null; // tempo que faltava quando pausou
  fim: boolean;
}

export interface Acao {
  tipo: "tick" | "pausar" | "retomar" | "avancar" | "pular" | "voltar";
  agora: number;
}

export const ehCronometrado = (p: Passo) => p.tipo === "tempo" || p.tipo === "descanso";

function entrar(passos: Passo[], i: number, agora: number, restanteMs?: number): EstadoCrono {
  if (i >= passos.length) {
    return { idx: passos.length - 1, terminaEm: null, pausadoMs: null, fim: true };
  }
  const p = passos[i];
  return {
    idx: i,
    terminaEm: ehCronometrado(p) ? agora + (restanteMs ?? (p.duracaoSeg ?? 0) * 1000) : null,
    pausadoMs: null,
    fim: false,
  };
}

export function estadoInicial(
  passos: Passo[],
  passoIndex: number,
  restanteMs: number | undefined,
  agora: number
): EstadoCrono {
  const i = Math.min(Math.max(passoIndex, 0), passos.length - 1);
  return entrar(passos, i, agora, restanteMs);
}

/** Milissegundos que faltam; null em passos manuais. */
export function restanteDe(e: EstadoCrono, agora: number): number | null {
  if (e.pausadoMs != null) return e.pausadoMs;
  if (e.terminaEm == null) return null;
  return Math.max(0, e.terminaEm - agora);
}

export function reduzir(passos: Passo[], e: EstadoCrono, a: Acao): EstadoCrono {
  if (e.fim) return e;
  const p = passos[e.idx];

  switch (a.tipo) {
    case "tick": {
      const r = restanteDe(e, a.agora);
      return r === 0 && e.pausadoMs == null ? entrar(passos, e.idx + 1, a.agora) : e;
    }
    case "pausar":
      if (e.terminaEm == null) return e;
      return { ...e, pausadoMs: Math.max(0, e.terminaEm - a.agora), terminaEm: null };
    case "retomar":
      if (e.pausadoMs == null) return e;
      return { ...e, terminaEm: a.agora + e.pausadoMs, pausadoMs: null };
    case "avancar":
      return entrar(passos, e.idx + 1, a.agora);
    case "pular": {
      // no descanso, vai para o próximo passo; nos demais, pula a etapa inteira
      if (p.tipo === "descanso") return entrar(passos, e.idx + 1, a.agora);
      const prox = passos.findIndex((x) => x.etapaIndex > p.etapaIndex);
      return entrar(passos, prox === -1 ? passos.length : prox, a.agora);
    }
    case "voltar": {
      let i = e.idx - 1;
      while (i >= 0 && passos[i].tipo === "descanso") i--;
      return entrar(passos, Math.max(i, 0), a.agora);
    }
  }
}
