import { addDays, format, startOfWeek } from "date-fns";
import { newId } from "@/lib/ids";
import type { KanbanCard, Status, Tag } from "./types";
import { WEEK_STARTS_ON } from "./utils/secoes";

const dia = (d: Date) => format(d, "yyyy-MM-dd");

/** Dados de exemplo, gerados em relação a hoje para sempre cair na semana certa. */
export function gerarMock(): { tags: Tag[]; cards: KanbanCard[] } {
  const hoje = new Date();
  const seg = startOfWeek(hoje, { weekStartsOn: WEEK_STARTS_ON });

  const tags: Tag[] = [
    { id: "t-trabalho", nome: "Trabalho" },
    { id: "t-casa", nome: "Casa" },
    { id: "t-estudos", nome: "Estudos" },
    { id: "t-saude", nome: "Saúde" },
  ];

  const card = (
    titulo: string,
    data: Date,
    hora: string,
    tagIds: string[],
    status: Status = "pendente",
    conteudo = ""
  ): KanbanCard => ({
    id: newId(),
    titulo,
    tags: tagIds,
    status,
    dataEntrega: dia(data),
    horaEntrega: hora,
    conteudo,
    criadoEm: new Date().toISOString(),
    concluidoEm: status === "feito" ? new Date().toISOString() : undefined,
  });

  const cards: KanbanCard[] = [
    card("Reunião de alinhamento", hoje, "10:00", ["t-trabalho"], "em_andamento"),
    card("Estudar inglês", hoje, "19:00", ["t-estudos"]),
    card("Consulta no dentista", addDays(seg, 1), "14:00", ["t-saude"]),
    card("Lavar roupa", addDays(seg, 2), "08:00", ["t-casa"]),
    card("Entregar proposta", addDays(seg, 4), "17:00", ["t-trabalho"], "pendente", "Enviar o PDF final para o cliente."),
    card("Ligar para o contador", addDays(seg, -3), "11:00", ["t-trabalho"]),
    card("Comprar presente", addDays(seg, -2), "16:00", ["t-casa"], "feito"),
    card("Aniversário da Ana", addDays(hoje, 12), "20:00", ["t-casa"]),
    card("Renovar documento do carro", addDays(hoje, 25), "09:00", []),
  ];

  return { tags, cards };
}
