export type Status = "pendente" | "em_andamento" | "feito";

export const STATUS_OPCOES: { valor: Status; rotulo: string }[] = [
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "feito", rotulo: "Feito" },
];

export interface Tag {
  id: string;
  nome: string;
}

export interface KanbanCard {
  id: string;
  titulo: string;
  tags: string[]; // ids de Tag
  status: Status;
  dataEntrega: string; // yyyy-MM-dd
  horaEntrega: string; // HH:mm
  conteudo: string; // texto livre (links etc.)
  criadoEm: string; // ISO
  concluidoEm?: string; // ISO
}

export interface Mostrar {
  finalizados: boolean;
  atrasados: boolean;
  futuros: boolean;
}
