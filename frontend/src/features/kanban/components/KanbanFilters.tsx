import type { ReactNode } from "react";
import { Tags } from "lucide-react";
import Button from "@/components/ui/Button";
import type { Tag } from "@/data/repositories/kanbanRepository";
import type { Visibility } from "../types";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-bg"
          : "border-border text-muted hover:bg-surface-hover hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

interface Props {
  visibility: Visibility;
  onVisibility: (v: Visibility) => void;
  counts: Record<keyof Visibility, number>;
  tags: Tag[];
  selectedTagIds: string[];
  onSelectTags: (ids: string[]) => void;
  onManageTags: () => void;
}

export default function KanbanFilters({
  visibility,
  onVisibility,
  counts,
  tags,
  selectedTagIds,
  onSelectTags,
  onManageTags,
}: Props) {
  const toggle = (key: keyof Visibility) => onVisibility({ ...visibility, [key]: !visibility[key] });
  const toggleTag = (id: string) =>
    onSelectTags(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter((t) => t !== id)
        : [...selectedTagIds, id]
    );

  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted">Mostrar:</span>
        <Chip active={visibility.overdue} onClick={() => toggle("overdue")}>
          Atrasados ({counts.overdue})
        </Chip>
        <Chip active={visibility.upcoming} onClick={() => toggle("upcoming")}>
          Eventos futuros ({counts.upcoming})
        </Chip>
        <Chip active={visibility.done} onClick={() => toggle("done")}>
          Finalizados ({counts.done})
        </Chip>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted">Tags:</span>
        {tags.map((tag) => (
          <Chip key={tag.id} active={selectedTagIds.includes(tag.id)} onClick={() => toggleTag(tag.id)}>
            {tag.name}
          </Chip>
        ))}
        {selectedTagIds.length > 0 && (
          <Button variant="ghost" onClick={() => onSelectTags([])}>
            Limpar
          </Button>
        )}
        <Button variant="ghost" className="ml-auto" onClick={onManageTags}>
          <Tags size={16} /> Gerenciar tags
        </Button>
      </div>
    </div>
  );
}
