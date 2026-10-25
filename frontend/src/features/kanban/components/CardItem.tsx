import { format, parseISO } from "date-fns";
import { AlarmClock, Clock, Repeat } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { BoardCard } from "@/data/repositories/kanbanRepository";
import { countdown, shortTime } from "../utils/format";

interface Props {
  item: BoardCard;
  /** Sections outside the week show the date next to the time */
  showDate?: boolean;
  /** Upcoming and overdue show "em 5 dias" / "há 2 dias" */
  showCountdown?: boolean;
  onClick?: () => void;
}

export default function CardItem({ item, showDate, showCountdown, onClick }: Props) {
  const { card, isLate, daysUntil } = item;
  const done = card.status === "done";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-border bg-bg p-3 transition-colors hover:bg-surface-hover"
    >
      {card.tags.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <Badge key={tag.id}>{tag.name}</Badge>
          ))}
        </div>
      )}

      <p className={done ? "text-muted line-through" : "font-medium"}>{card.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock size={12} />
          {showDate && `${format(parseISO(card.dueDate), "dd/MM")} · `}
          {shortTime(card.dueTime)}
        </span>
        {showCountdown && <span>{countdown(daysUntil)}</span>}
        {card.recurrenceId && (
          <span title="Card recorrente" className="inline-flex">
            <Repeat size={12} />
          </span>
        )}
        {card.status === "in_progress" && <Badge variant="primary">Em andamento</Badge>}
        {isLate && (
          <span className="inline-flex items-center gap-1 text-red-400" title="Atrasado">
            <AlarmClock size={14} />
            Atrasado
          </span>
        )}
      </div>
    </div>
  );
}
