/** Três tipos de etapa, que podem se misturar no mesmo bloco (seção 7.3). */
export interface EtapaTempo {
  id: string;
  tipo: "tempo";
  nome: string;
  duracaoSeg: number;
  descansoSeg: number; // descanso depois da etapa
}

export interface EtapaRepeticoes {
  id: string;
  tipo: "repeticoes";
  nome: string;
  series: number;
  reps: number;
  descansoSeg: number; // descanso entre séries
}

export interface EtapaDistancia {
  id: string;
  tipo: "distancia";
  nome: string;
  km: number;
}

export type Etapa = EtapaTempo | EtapaRepeticoes | EtapaDistancia;

export interface Sessao {
  id: string;
  numero: number; // Dia 1, Dia 2...
  etapas: Etapa[];
}

export interface Programa {
  id: string;
  nome: string;
  sessoes: Sessao[];
}

export interface TreinoAvulso {
  id: string;
  nome: string;
  etapas: Etapa[];
}

export type Origem = "sessao" | "avulso";
export type EstadoBloco = "nao_iniciado" | "em_andamento" | "concluido";

export const ESTADO_ROTULO: Record<EstadoBloco, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

/**
 * Bloco usado em um dia. Guarda uma cópia das etapas, para o histórico
 * não mudar se a biblioteca for editada depois.
 */
export interface BlocoDia {
  id: string;
  origem: Origem;
  origemId: string;
  titulo: string;
  etapas: Etapa[];
  estado: EstadoBloco;
  /** Passo em que parou (ver utils/passos.ts) */
  passoIndex: number;
  /** Tempo que faltava no passo cronometrado quando o modal foi fechado */
  restanteMs?: number;
}
