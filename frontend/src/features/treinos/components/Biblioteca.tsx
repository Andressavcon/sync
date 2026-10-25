import { useState, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import Card from "@/components/ui/Card";
import { useTreinos } from "../hooks/useTreinos";
import type { Origem } from "../types";

function Arrastavel({
  dndId,
  onClick,
  className,
  children,
}: {
  dndId: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: dndId });
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

interface Props {
  onAdd: (origem: Origem, origemId: string) => void;
}

export default function Biblioteca({ onAdd }: Props) {
  const { programas, avulsos } = useTreinos();
  const [aberto, setAberto] = useState<string | null>(programas[0]?.id ?? null);

  return (
    <Card title="Biblioteca" description="Arraste para o treino de hoje ou toque para adicionar.">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Programas</h3>
          {programas.map((p) => {
            const expandido = aberto === p.id;
            return (
              <div key={p.id} className="rounded-lg border border-border">
                <button
                  type="button"
                  aria-expanded={expandido}
                  onClick={() => setAberto(expandido ? null : p.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover"
                >
                  <span className="flex-1">
                    <span className="block font-medium">{p.nome}</span>
                    <span className="block text-xs text-muted">{p.sessoes.length} sessões</span>
                  </span>
                  {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expandido && (
                  <div className="grid grid-cols-4 gap-2 border-t border-border p-3">
                    {p.sessoes.map((s) => (
                      <Arrastavel
                        key={s.id}
                        dndId={`lib|sessao|${s.id}`}
                        onClick={() => onAdd("sessao", s.id)}
                        className="px-1 py-2 text-center text-sm"
                      >
                        Dia {s.numero}
                      </Arrastavel>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Treinos avulsos</h3>
          {avulsos.map((a) => (
            <Arrastavel
              key={a.id}
              dndId={`lib|avulso|${a.id}`}
              onClick={() => onAdd("avulso", a.id)}
              className="flex items-center gap-2 px-3 py-2"
            >
              <span className="flex-1">
                <span className="block font-medium">{a.nome}</span>
                <span className="block text-xs text-muted">{a.etapas.length} etapas</span>
              </span>
              <Plus size={16} className="text-muted" />
            </Arrastavel>
          ))}
        </div>
      </div>
    </Card>
  );
}
