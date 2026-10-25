import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import Button from "@/components/ui/Button";
import FormModal from "@/components/ui/FormModal";
import type { ShoppingCategory } from "@/data/repositories/shoppingRepository";

interface Props {
  categories: ShoppingCategory[];
  onClose: () => void;
  onSave: (categoryIds: string[]) => Promise<boolean>;
}

/** Puts the categories in the order of the market aisles (section 8.2). */
export default function CategoryOrderModal({ categories, onClose, onSave }: Props) {
  const [order, setOrder] = useState(categories);
  const [saving, setSaving] = useState(false);

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  async function save() {
    setSaving(true);
    if (await onSave(order.map((c) => c.id))) onClose();
    else setSaving(false);
  }

  return (
    <FormModal
      titulo="Ordem das categorias"
      onClose={onClose}
      rodape={
        <>
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            Salvar ordem
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">Na mesma ordem dos corredores do mercado.</p>
      <ol className="flex flex-col gap-2">
        {order.map((category, index) => (
          <li
            key={category.id}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
          >
            <span className="w-6 text-sm text-muted">{index + 1}.</span>
            <span className="flex-1">{category.name}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Subir ${category.name}`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Descer ${category.name}`}
              disabled={index === order.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={16} />
            </Button>
          </li>
        ))}
      </ol>
    </FormModal>
  );
}
