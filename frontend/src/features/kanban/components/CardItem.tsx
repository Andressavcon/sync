import { AlarmClock, Clock } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { format, parseISO } from "date-fns";
import { contagemRegressiva, estaAtrasado } from "../utils/secoes";
import { STATUS_OPCOES, type KanbanCard, type Tag } from "../types";

interface Props {
  card: KanbanCard;
  tags: Tag[];
  now: Date;
  /** Seções fora da semana mostram a data junto da hora */
  mostrarData?: boolean;
  /** Eventos futuros e atrasados mostram "em 5 dias" / "há 2 dias" */
  mostrarContagem?: boolean;
  onClick?: () => void;
}

export default function CardItem({ card, tags, now, mostrarData, mostrarContagem, onClick }: Props) {
  const atrasado = estaAtrasado(card, now);
  const nomesTags = card.tags
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));
  const statusRotulo = STATUS_OPCOES.find((s) => s.valor === card.status)?.rotulo;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-border bg-bg p-3 transition-colors hover:bg-surface-hover"
    >
      {nomesTags.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {nomesTags.map((t) => (
            <Badge key={t.id}>{t.nome}</Badge>
          ))}
        </div>
      )}

      <p className={card.status === "feito" ? "text-muted line-through" : "font-medium"}>
        {card.titulo}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock size={12} />
          {mostrarData && `${format(parseISO(card.dataEntrega), "dd/MM")} · `}
          {card.horaEntrega}
        </span>
        {mostrarContagem && <span>{contagemRegressiva(card, now)}</span>}
        {card.status === "em_andamento" && <Badge variant="primary">{statusRotulo}</Badge>}
        {atrasado && (
          <span className="inline-flex items-center gap-1 text-red-400" title="Atrasado">
            <AlarmClock size={14} />
            Atrasado
          </span>
        )}
      </div>
    </div>
  );
}
