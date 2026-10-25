import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { BoardCard, Card } from "@/data/repositories/kanbanRepository";
import CardItem from "./CardItem";

interface ItemOptions {
  showDate?: boolean;
  showCountdown?: boolean;
  onOpen: (card: Card) => void;
}

function DraggableCard({ item, onOpen, ...options }: ItemOptions & { item: BoardCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.card.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-40" : ""}
    >
      <CardItem item={item} onClick={() => onOpen(item.card)} {...options} />
    </div>
  );
}

interface Props extends ItemOptions {
  /** Droppable id: "day:yyyy-MM-dd" or "section:..." */
  id: string;
  title: string;
  subtitle?: string;
  /** Highlights today's column */
  highlight?: boolean;
  /** Accepts dropped cards (days and Done) */
  droppable?: boolean;
  items: BoardCard[];
  emptyText: string;
  onAdd?: () => void;
}

export default function KanbanColumn({
  id,
  title,
  subtitle,
  highlight,
  droppable,
  items,
  emptyText,
  onAdd,
  ...options
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !droppable });

  return (
    <section
      ref={setNodeRef}
      className={[
        "min-h-40 rounded-xl border bg-surface p-4 transition-shadow",
        highlight ? "border-primary" : "border-border",
        isOver ? "ring-2 ring-primary" : "",
      ].join(" ")}
    >
      <header className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold capitalize">
            {title}
            {highlight && <Badge variant="primary">Hoje</Badge>}
          </h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <span className="text-sm text-muted">{items.length}</span>
        {onAdd && (
          <Button variant="ghost" size="icon" aria-label={`Adicionar card em ${title}`} onClick={onAdd}>
            <Plus size={18} />
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <DraggableCard key={item.card.id} item={item} {...options} />
          ))}
        </div>
      )}
    </section>
  );
}
