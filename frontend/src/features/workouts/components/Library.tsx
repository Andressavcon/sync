import { useState, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { Library as LibraryData, SourceType } from "@/data/repositories/workoutsRepository";
import { libraryDragId } from "../utils/dragIds";
import ProgramModal from "./ProgramModal";
import StandaloneModal from "./StandaloneModal";

function Draggable({
  dragId,
  onClick,
  className,
  children,
}: {
  dragId: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dragId });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`cursor-pointer select-none rounded-lg border border-border bg-bg transition-colors hover:bg-surface-hover ${className} ${isDragging ? "opacity-40" : ""}`}
    >
      {children}
    </div>
  );
}

type Editing = { kind: "program"; id?: string } | { kind: "standalone"; id?: string };

interface Props {
  library: LibraryData;
  /** Puts an item on today's workout */
  onAdd: (sourceType: SourceType, sourceId: string) => void;
  /** Runs a library change and reloads it */
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

export default function Library({ library, onAdd, onChange }: Props) {
  const [openProgramId, setOpenProgramId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);

  const editedProgram =
    editing?.kind === "program" ? library.programs.find((p) => p.id === editing.id) : undefined;
  const editedStandalone =
    editing?.kind === "standalone" ? library.standalone.find((w) => w.id === editing.id) : undefined;

  return (
    <Card title="Biblioteca" description="Arraste para o treino de hoje ou toque para adicionar.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center">
            <h3 className="flex-1 text-xs font-medium uppercase tracking-wide text-muted">Programas</h3>
            <Button variant="ghost" onClick={() => setEditing({ kind: "program" })}>
              <Plus size={14} /> Programa
            </Button>
          </div>
          {library.programs.length === 0 && (
            <p className="text-sm text-muted">Nenhum programa. Ex.: "Metabólico", 21 dias.</p>
          )}
          {library.programs.map((program) => {
            const open = openProgramId === program.id;
            return (
              <div key={program.id} className="rounded-lg border border-border">
                <div className="flex items-center">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenProgramId(open ? null : program.id)}
                    className="flex flex-1 items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover"
                  >
                    <span className="flex-1">
                      <span className="block font-medium">{program.name}</span>
                      <span className="block text-xs text-muted">{program.sessions.length} dias</span>
                    </span>
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${program.name}`}
                    onClick={() => setEditing({ kind: "program", id: program.id })}
                  >
                    <Pencil size={14} />
                  </Button>
                </div>
                {open && (
                  <div className="grid grid-cols-4 gap-2 border-t border-border p-3">
                    {program.sessions.map((session) => (
                      <Draggable
                        key={session.id}
                        dragId={libraryDragId("session", session.id)}
                        onClick={() => onAdd("session", session.id)}
                        className="px-1 py-2 text-center text-sm"
                      >
                        Dia {session.number}
                      </Draggable>
                    ))}
                    {program.sessions.length === 0 && (
                      <p className="col-span-4 text-sm text-muted">Sem dias: use o lápis para adicionar.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center">
            <h3 className="flex-1 text-xs font-medium uppercase tracking-wide text-muted">
              Treinos avulsos
            </h3>
            <Button variant="ghost" onClick={() => setEditing({ kind: "standalone" })}>
              <Plus size={14} /> Treino
            </Button>
          </div>
          {library.standalone.length === 0 && (
            <p className="text-sm text-muted">Nenhum treino avulso. Ex.: Corrida, Yoga.</p>
          )}
          {library.standalone.map((workout) => (
            <div key={workout.id} className="flex items-center gap-1">
              <Draggable
                dragId={libraryDragId("standalone", workout.id)}
                onClick={() => onAdd("standalone", workout.id)}
                className="flex flex-1 items-center gap-2 px-3 py-2"
              >
                <span className="flex-1">
                  <span className="block font-medium">{workout.name}</span>
                  <span className="block text-xs text-muted">{workout.steps.length} etapas</span>
                </span>
                <Plus size={16} className="text-muted" />
              </Draggable>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar ${workout.name}`}
                onClick={() => setEditing({ kind: "standalone", id: workout.id })}
              >
                <Pencil size={14} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {editing?.kind === "program" && (
        <ProgramModal program={editedProgram} onClose={() => setEditing(null)} onChange={onChange} />
      )}
      {editing?.kind === "standalone" && (
        <StandaloneModal workout={editedStandalone} onClose={() => setEditing(null)} onChange={onChange} />
      )}
    </Card>
  );
}
