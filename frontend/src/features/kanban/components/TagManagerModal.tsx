import { useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { ApiError, getErrorMessage } from "@/data/api";
import { kanbanRepository, type Tag } from "@/data/repositories/kanbanRepository";

function tagErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) return "Já existe uma tag com esse nome.";
  return getErrorMessage(error);
}

interface Props {
  tags: Tag[];
  onClose: () => void;
  /** Called after any change, so the page reloads tags and board */
  onChanged: () => void;
}

export default function TagManagerModal({ tags, onClose, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    try {
      await action();
      onChanged();
      return true;
    } catch (e) {
      setError(tagErrorMessage(e));
      return false;
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (name && (await run(() => kanbanRepository.createTag(name)))) setNewName("");
  }

  async function rename(id: string) {
    const name = editName.trim();
    if (name && (await run(() => kanbanRepository.renameTag(id, name)))) setEditingId(null);
  }

  function remove(tag: Tag) {
    if (window.confirm(`Excluir a tag "${tag.name}"? Ela sai dos cards, mas os cards continuam.`)) {
      void run(() => kanbanRepository.deleteTag(tag.id));
    }
  }

  return (
    <FormModal titulo="Tags" onClose={onClose}>
      {tags.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma tag ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center gap-2 py-2">
              {editingId === tag.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void rename(tag.id)}
                    aria-label="Nome da tag"
                    autoFocus
                  />
                  <Button size="icon" aria-label="Salvar" onClick={() => void rename(tag.id)} disabled={!editName.trim()}>
                    <Check size={16} />
                  </Button>
                  <Button variant="secondary" size="icon" aria-label="Cancelar" onClick={() => setEditingId(null)}>
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1">{tag.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Renomear ${tag.name}`}
                    onClick={() => {
                      setEditingId(tag.id);
                      setEditName(tag.name);
                    }}
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Excluir ${tag.name}`} onClick={() => remove(tag)}>
                    <Trash2 size={16} />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={create} className="flex gap-2">
        <Input
          placeholder="Nova tag…"
          aria-label="Nome da nova tag"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!newName.trim()} className="shrink-0">
          <Plus size={16} /> Tag
        </Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </FormModal>
  );
}
