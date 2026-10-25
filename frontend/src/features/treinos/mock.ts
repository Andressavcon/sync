import { addDays, format } from "date-fns";
import { newId } from "@/lib/ids";
import type { BlocoDia, Etapa, Programa, TreinoAvulso } from "./types";

const tempo = (nome: string, duracaoSeg: number, descansoSeg = 0): Etapa => ({
  id: newId(),
  tipo: "tempo",
  nome,
  duracaoSeg,
  descansoSeg,
});
const reps = (nome: string, series: number, qtd: number, descansoSeg: number): Etapa => ({
  id: newId(),
  tipo: "repeticoes",
  nome,
  series,
  reps: qtd,
  descansoSeg,
});
const dist = (nome: string, km: number): Etapa => ({ id: newId(), tipo: "distancia", nome, km });

export function gerarMock(): {
  programas: Programa[];
  avulsos: TreinoAvulso[];
  dias: Record<string, BlocoDia[]>;
} {
  // Programa com 21 sessões (as repetições crescem a cada semana)
  const metabolico: Programa = {
    id: "prog-metabolico",
    nome: "Metabólico",
    sessoes: Array.from({ length: 21 }, (_, i) => {
      const n = i + 1;
      const base = 8 + Math.floor(i / 7) * 2;
      return {
        id: `metabolico-${n}`,
        numero: n,
        etapas: [
          tempo("Aquecimento", 120),
          reps("Agachamento", 3, base, 30),
          reps("Flexão de braço", 3, base, 30),
          tempo("Prancha", 40, 20),
          tempo("Polichinelo", 45, 15),
          tempo("Alongamento", 90),
        ],
      };
    }),
  };

  const corrida: TreinoAvulso = {
    id: "avulso-corrida",
    nome: "Corrida",
    etapas: [dist("Corrida leve", 5)],
  };

  const avulsos: TreinoAvulso[] = [
    corrida,
    {
      id: "avulso-jump",
      nome: "Jump",
      etapas: Array.from({ length: 6 }, (_, i) => tempo(`Jump ${i + 1}`, 45, 15)),
    },
    {
      id: "avulso-yoga",
      nome: "Yoga pós-treino",
      etapas: [
        tempo("Postura da criança", 60, 10),
        tempo("Cachorro olhando para baixo", 60, 10),
        tempo("Gato e vaca", 60, 10),
        tempo("Torção sentada", 60, 10),
        tempo("Savasana", 120),
      ],
    },
    {
      // só para testar o cronômetro rápido; apague quando o editor de treinos existir
      id: "avulso-teste",
      nome: "Teste rápido (cronômetro)",
      etapas: [tempo("Etapa por tempo", 10, 5), reps("Etapa por repetições", 2, 5, 5), dist("Etapa por distância", 1)],
    },
  ];

  // Histórico de exemplo para o calendário
  const dias: Record<string, BlocoDia[]> = {};
  const hoje = new Date();
  [1, 2, 4, 5, 7, 8, 9].forEach((offset, i) => {
    dias[format(addDays(hoje, -offset), "yyyy-MM-dd")] = [
      {
        id: newId(),
        origem: "avulso",
        origemId: corrida.id,
        titulo: corrida.nome,
        etapas: corrida.etapas,
        estado: i === 3 ? "nao_iniciado" : "concluido", // um dia não feito
        passoIndex: 0,
      },
    ];
  });

  return { programas: [metabolico], avulsos, dias };
}
