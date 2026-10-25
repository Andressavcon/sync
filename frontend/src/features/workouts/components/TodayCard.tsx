import { useDroppable } from "@dnd-kit/core";
import { Play } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { Block, Day } from "@/data/repositories/workoutsRepository";
import { TODAY_DROP_ID } from "../utils/dragIds";
import BlockItem from "./BlockItem";

interface Props {
  day: Day;
  onStart: (block: Block) => void;
  onToggleDone: (block: Block, done: boolean) => void;
  onRemove: (block: Block) => void;
}

/** Today's workout is built by dropping library blocks here (section 7.2). */
export default function TodayCard({ day, onStart, onToggleDone, onRemove }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: TODAY_DROP_ID });
  const { blocks } = day;
  const doneCount = blocks.filter((b) => b.state === "done").length;
  const next = blocks.find((b) => b.state !== "done" && b.steps.length > 0);

  return (
    <section
      ref={setNodeRef}
      className={[
        "glass rounded-3xl p-5 transition-shadow lg:p-6",
        isOver ? "ring-2 ring-primary" : "",
      ].join(" ")}
    >
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            Treino de hoje
            {day.completed && <Badge variant="primary">Concluído</Badge>}
          </h2>
          <p className="text-sm text-muted">
            {blocks.length === 0
              ? "Nenhum bloco montado"
              : `${doneCount} de ${blocks.length} ${blocks.length === 1 ? "bloco" : "blocos"}`}
          </p>
        </div>
        <Button disabled={!next} onClick={() => next && onStart(next)}>
          <Play size={16} />
          {next?.state === "in_progress" ? "Continuar treino" : "Iniciar treino"}
        </Button>
      </header>

      {blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted">
          Arraste um bloco da biblioteca para cá, ou toque nele.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {blocks.map((block) => (
            <BlockItem
              key={block.id}
              block={block}
              readOnly={day.readOnly}
              onStart={() => onStart(block)}
              onToggleDone={(done) => onToggleDone(block, done)}
              onRemove={() => onRemove(block)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
