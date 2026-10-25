import { Plus } from "lucide-react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { KanbanCard, Tag } from "../types";
import CardItem from "./CardItem";

interface CardProps {
  tags: Tag[];
  now: Date;
  mostrarData?: boolean;
  mostrarContagem?: boolean;
  onAbrir: (card: KanbanCard) => void;
}

function CardArrastavel({ card, onAbrir, ...resto }: CardProps & { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-40" : ""}
    >
      <CardItem card={card} onClick={() => onAbrir(card)} {...resto} />
    </div>
  );
}

interface Props extends CardProps {
  /** id do droppable: "dia:yyyy-MM-dd" ou "secao:..." */
  id: string;
  titulo: string;
  subtitulo?: string;
  /** Destaca a coluna de hoje */
  destaque?: boolean;
  /** Aceita cards soltos nela (dias e Finalizados) */
  soltavel?: boolean;
  cards: KanbanCard[];
  vazio: string;
  onAdd?: () => void;
}

export default function KanbanColumn({
  id,
  titulo,
  subtitulo,
  destaque,
  soltavel,
  cards,
  vazio,
  onAdd,
  ...resto
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !soltavel });

  return (
    <section
      ref={setNodeRef}
      className={[
        "min-h-40 rounded-xl border bg-surface p-4 transition-shadow",
        destaque ? "border-primary" : "border-border",
        isOver ? "ring-2 ring-primary" : "",
      ].join(" ")}
    >
      <header className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold capitalize">
            {titulo}
            {destaque && <Badge variant="primary">Hoje</Badge>}
          </h2>
          {subtitulo && <p className="text-xs text-muted">{subtitulo}</p>}
        </div>
        <span className="text-sm text-muted">{cards.length}</span>
        {onAdd && (
          <Button variant="ghost" size="icon" aria-label={`Adicionar card em ${titulo}`} onClick={onAdd}>
            <Plus size={18} />
          </Button>
        )}
      </header>

      {cards.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">{vazio}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((card) => (
            <CardArrastavel key={card.id} card={card} {...resto} />
          ))}
        </div>
      )}
    </section>
  );
}
