import type { Etapa } from "../types";

export type PassoTipo = "tempo" | "serie" | "distancia" | "descanso";

/**
 * O bloco vira uma fila de passos. Tempo e descanso andam sozinhos;
 * série e distância esperam o "Concluir".
 */
export interface Passo {
  tipo: PassoTipo;
  etapaIndex: number;
  nome: string;
  duracaoSeg?: number; // tempo e descanso
  serie?: number;
  totalSeries?: number;
  reps?: number;
  km?: number;
}

export function montarPassos(etapas: Etapa[]): Passo[] {
  const passos: Passo[] = [];
  const ultima = etapas.length - 1;

  etapas.forEach((e, etapaIndex) => {
    if (e.tipo === "tempo") {
      passos.push({ tipo: "tempo", etapaIndex, nome: e.nome, duracaoSeg: e.duracaoSeg });
      if (e.descansoSeg > 0 && etapaIndex < ultima) {
        passos.push({ tipo: "descanso", etapaIndex, nome: "Descanso", duracaoSeg: e.descansoSeg });
      }
    } else if (e.tipo === "repeticoes") {
      for (let s = 1; s <= e.series; s++) {
        passos.push({
          tipo: "serie",
          etapaIndex,
          nome: e.nome,
          serie: s,
          totalSeries: e.series,
          reps: e.reps,
        });
        const haProxima = s < e.series || etapaIndex < ultima;
        if (e.descansoSeg > 0 && haProxima) {
          passos.push({ tipo: "descanso", etapaIndex, nome: "Descanso", duracaoSeg: e.descansoSeg });
        }
      }
    } else {
      passos.push({ tipo: "distancia", etapaIndex, nome: e.nome, km: e.km });
    }
  });

  return passos;
}
