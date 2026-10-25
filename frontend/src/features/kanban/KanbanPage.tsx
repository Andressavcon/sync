import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { getErrorMessage } from "@/data/api";
import {
  kanbanRepository,
  type Board,
  type BoardCard,
  type Card,
} from "@/data/repositories/kanbanRepository";
import CardItem from "./components/CardItem";
import CardModal from "./components/CardModal";
import KanbanColumn from "./components/KanbanColumn";
import KanbanFilters from "./components/KanbanFilters";
import TagManagerModal from "./components/TagManagerModal";
import { useBoard } from "./hooks/useBoard";
import { useTags } from "./hooks/useTags";
import type { Visibility } from "./types";

interface Editor {
  card?: Card;
  initialDate?: string;
}

const longDate = (date: string) => format(parseISO(date), "d 'de' MMMM", { locale: ptBR });
const shortDate = (date: string) => format(parseISO(date), "d 'de' MMM", { locale: ptBR });

function allItems(board: Board): BoardCard[] {
  return [...board.days.flatMap((d) => d.cards), ...board.overdue, ...board.upcoming, ...board.done];
}

export default function KanbanPage() {
  const [visibility, setVisibility] = useState<Visibility>({
    overdue: true,
    upcoming: true,
    done: true,
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { tags, reload: reloadTags } = useTags();
  // Ignore selected tags that were deleted in the meantime
  const activeTagIds = selectedTagIds.filter((id) => tags.some((t) => t.id === id));
  const { board, error, reload: reloadBoard } = useBoard(activeTagIds);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [managingTags, setManagingTags] = useState(false);
  const [dragging, setDragging] = useState<BoardCard | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Mouse drags after moving 6px; touch needs a short hold, so scrolling still works
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );

  function reloadAll() {
    void reloadBoard();
    void reloadTags();
  }

  /** Runs a change from the board itself (dragging) and reloads it. */
  async function change(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (e) {
      setActionError(getErrorMessage(e));
    }
    await reloadBoard();
  }

  if (!board) {
    return (
      <p className={`py-10 text-center ${error ? "text-red-400" : "text-muted"}`}>
        {error ?? "Carregando…"}
      </p>
    );
  }

  function onDragStart(e: DragStartEvent) {
    setDragging(allItems(board!).find((i) => i.card.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const item = allItems(board!).find((i) => i.card.id === e.active.id);
    if (!e.over || !item) return;
    const { card } = item;
    const target = String(e.over.id);

    if (target.startsWith("day:")) {
      const date = target.slice(4);
      if (date === card.dueDate && card.status !== "done") return;
      // New date, same time; a finished card dragged back to a day reopens (section 4.4)
      void change(() =>
        kanbanRepository.updateCard(card.id, {
          dueDate: date,
          ...(card.status === "done" ? { status: "pending" as const } : {}),
        })
      );
    } else if (target === "section:done" && card.status !== "done") {
      void change(() => kanbanRepository.updateCard(card.id, { status: "done" }));
    }
  }

  const openCard = (card: Card) => setEditor({ card });

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kanban</h1>
          <p className="text-sm text-muted">
            Semana de {shortDate(board.weekStart)} a {shortDate(board.weekEnd)}
          </p>
        </div>
        <Button onClick={() => setEditor({})}>
          <Plus size={16} /> Novo card
        </Button>
      </div>

      {(error || actionError) && (
        <p className="rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-400">
          {actionError ?? error}
        </p>
      )}

      <KanbanFilters
        visibility={visibility}
        onVisibility={setVisibility}
        counts={{
          overdue: board.overdue.length,
          upcoming: board.upcoming.length,
          done: board.done.length,
        }}
        tags={tags}
        selectedTagIds={activeTagIds}
        onSelectTags={setSelectedTagIds}
        onManageTags={() => setManagingTags(true)}
      />

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {board.days.map((day) => (
            <KanbanColumn
              key={day.date}
              id={`day:${day.date}`}
              title={format(parseISO(day.date), "EEEE", { locale: ptBR })}
              subtitle={longDate(day.date)}
              highlight={day.isToday}
              droppable
              items={day.cards}
              emptyText="Nenhum card neste dia."
              onAdd={() => setEditor({ initialDate: day.date })}
              onOpen={openCard}
            />
          ))}

          {visibility.overdue && (
            <KanbanColumn
              id="section:overdue"
              title="Atrasados"
              subtitle="Não concluídos de semanas anteriores"
              items={board.overdue}
              emptyText="Nada atrasado."
              showDate
              showCountdown
              onOpen={openCard}
            />
          )}

          {visibility.upcoming && (
            <KanbanColumn
              id="section:upcoming"
              title="Eventos futuros"
              subtitle="Depois desta semana"
              items={board.upcoming}
              emptyText="Nenhum evento futuro."
              showDate
              showCountdown
              onOpen={openCard}
            />
          )}

          {visibility.done && (
            <KanbanColumn
              id="section:done"
              title="Finalizados"
              subtitle="Arraste um card para cá para concluir"
              droppable
              items={board.done}
              emptyText="Nenhum card finalizado."
              showDate
              onOpen={openCard}
            />
          )}
        </div>

        <DragOverlay>{dragging && <CardItem item={dragging} />}</DragOverlay>
      </DndContext>

      {editor && (
        <CardModal
          card={editor.card}
          initialDate={editor.initialDate}
          tags={tags}
          onClose={() => setEditor(null)}
          onChanged={reloadAll}
        />
      )}

      {managingTags && (
        <TagManagerModal
          tags={tags}
          onClose={() => setManagingTags(false)}
          onChanged={reloadAll}
        />
      )}
    </div>
  );
}
