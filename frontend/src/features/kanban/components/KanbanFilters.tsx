import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import type { Mostrar, Tag } from "../types";

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-sm transition-colors",
        ativo
          ? "border-primary bg-primary text-bg"
          : "border-border text-muted hover:bg-surface-hover hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

interface Props {
  mostrar: Mostrar;
  onMostrar: (m: Mostrar) => void;
  contagens: Record<keyof Mostrar, number>;
  tags: Tag[];
  tagsSelecionadas: string[];
  onTags: (ids: string[]) => void;
}

export default function KanbanFilters({
  mostrar,
  onMostrar,
  contagens,
  tags,
  tagsSelecionadas,
  onTags,
}: Props) {
  const alternarTag = (id: string) =>
    onTags(
      tagsSelecionadas.includes(id)
        ? tagsSelecionadas.filter((t) => t !== id)
        : [...tagsSelecionadas, id]
    );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted">Mostrar:</span>
        <Chip
          ativo={mostrar.atrasados}
          onClick={() => onMostrar({ ...mostrar, atrasados: !mostrar.atrasados })}
        >
          Atrasados ({contagens.atrasados})
        </Chip>
        <Chip
          ativo={mostrar.futuros}
          onClick={() => onMostrar({ ...mostrar, futuros: !mostrar.futuros })}
        >
          Eventos futuros ({contagens.futuros})
        </Chip>
        <Chip
          ativo={mostrar.finalizados}
          onClick={() => onMostrar({ ...mostrar, finalizados: !mostrar.finalizados })}
        >
          Finalizados ({contagens.finalizados})
        </Chip>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted">Tags:</span>
          {tags.map((t) => (
            <Chip key={t.id} ativo={tagsSelecionadas.includes(t.id)} onClick={() => alternarTag(t.id)}>
              {t.nome}
            </Chip>
          ))}
          {tagsSelecionadas.length > 0 && (
            <Button variant="ghost" onClick={() => onTags([])}>
              Limpar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
