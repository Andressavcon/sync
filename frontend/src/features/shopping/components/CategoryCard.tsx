import { useState, type ReactNode } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import type { ShoppingCategory } from "@/data/repositories/shoppingRepository";

interface Props {
  category: ShoppingCategory;
  itemCount: number;
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => void;
  /** The item rows */
  children: ReactNode;
}

export default function CategoryCard({ category, itemCount, onRename, onDelete, children }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);

  async function save() {
    if (name.trim() && (await onRename(name.trim()))) setEditing(false);
  }

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        {editing ? (
          <>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void save()}
              aria-label="Nome da categoria"
              autoFocus
            />
            <Button size="icon" onClick={() => void save()} aria-label="Salvar" disabled={!name.trim()}>
              <Check size={16} />
            </Button>
            <Button variant="secondary" size="icon" aria-label="Cancelar" onClick={() => setEditing(false)}>
              <X size={16} />
            </Button>
          </>
        ) : (
          <>
            <h2 className="flex-1 text-lg font-semibold">{category.name}</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Renomear categoria"
              onClick={() => {
                setName(category.name);
                setEditing(true);
              }}
            >
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Excluir categoria" onClick={onDelete}>
              <Trash2 size={16} />
            </Button>
          </>
        )}
      </div>

      {itemCount === 0 ? (
        <p className="py-2 text-sm text-muted">Sem itens.</p>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </Card>
  );
}
