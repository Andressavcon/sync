import { useState } from "react";
import { Check, Pencil, Star, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import type {
  ItemInput,
  ShoppingCategory,
  ShoppingItem,
} from "@/data/repositories/shoppingRepository";
import { fieldClass } from "@/lib/ui";

interface Props {
  item: ShoppingItem;
  categories: ShoppingCategory[];
  /** Shown in the Important section, where categories are mixed */
  categoryName?: string;
  onCheck: (purchased: boolean) => void;
  onUpdate: (changes: Partial<ItemInput>) => Promise<boolean>;
  onDelete: () => void;
}

export default function ItemRow({
  item,
  categories,
  categoryName,
  onCheck,
  onUpdate,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [categoryId, setCategoryId] = useState(item.categoryId);

  function startEditing() {
    setName(item.name);
    setQuantity(item.quantity);
    setCategoryId(item.categoryId);
    setEditing(true);
  }

  async function save() {
    if (!name.trim()) return;
    if (await onUpdate({ name: name.trim(), quantity: quantity.trim(), categoryId })) {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 py-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do item" autoFocus />
        <div className="flex gap-2">
          <Input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantidade"
            aria-label="Quantidade"
          />
          <select
            className={fieldClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Categoria"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditing(false)}>
            <X size={16} /> Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={!name.trim()}>
            <Check size={16} /> Salvar
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <Checkbox
        label={`Marcar ${item.name} como comprado`}
        checked={item.purchased}
        onChange={onCheck}
      />
      <div className="min-w-0 flex-1">
        <p className={item.purchased ? "text-muted line-through" : ""}>
          {item.name}
          {item.quantity && <span className="ml-2 text-sm text-muted">{item.quantity}</span>}
        </p>
        {categoryName && <p className="text-xs text-muted">{categoryName}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={item.important ? "Tirar de importante" : "Marcar como importante"}
        onClick={() => void onUpdate({ important: !item.important })}
      >
        <Star size={16} className={item.important ? "fill-primary text-primary" : ""} />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Editar item" onClick={startEditing}>
        <Pencil size={16} />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Excluir item" onClick={onDelete}>
        <Trash2 size={16} />
      </Button>
    </li>
  );
}
