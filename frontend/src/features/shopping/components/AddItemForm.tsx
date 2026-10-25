import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import {
  shoppingRepository,
  type ItemInput,
  type ShoppingCategory,
} from "@/data/repositories/shoppingRepository";
import { fieldClass } from "@/lib/ui";

const SUGGESTION_DELAY_MS = 250; // waits the user stop typing before asking the server

interface Props {
  categories: ShoppingCategory[];
  onAdd: (input: ItemInput) => Promise<boolean>;
}

export default function AddItemForm({ categories, onAdd }: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [important, setImportant] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // If the chosen category was deleted, fall back to the first one
  const currentCategory = categories.some((c) => c.id === categoryId)
    ? categoryId
    : (categories[0]?.id ?? "");
  const typed = name.trim();

  // Suggestions from archived lists while typing (section 8.3)
  useEffect(() => {
    if (!typed) return;
    let active = true;
    const timer = setTimeout(() => {
      shoppingRepository
        .suggestions(typed)
        .then((names) => active && setSuggestions(names))
        .catch(() => {}); // suggestions are optional (e.g. offline)
    }, SUGGESTION_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [typed]);

  const visibleSuggestions = typed
    ? suggestions.filter((s) => s.toLowerCase() !== typed.toLowerCase())
    : [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!typed || !currentCategory) return;
    const added = await onAdd({
      name: typed,
      quantity: quantity.trim(),
      categoryId: currentCategory,
      important,
    });
    if (added) {
      setName("");
      setQuantity("");
      setImportant(false);
    }
  }

  return (
    <Card>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="flex-1"
            placeholder="Adicionar item…"
            aria-label="Nome do item"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            className="sm:w-36"
            placeholder="Qtd. (opcional)"
            aria-label="Quantidade"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        {visibleSuggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Sugestões:</span>
            {visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setName(suggestion)}
                className="rounded-full border border-border px-3 py-1 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-text"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <select
            className={`${fieldClass} sm:w-auto`}
            aria-label="Categoria"
            value={currentCategory}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.length === 0 && <option value="">Crie uma categoria</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox label="Importante" checked={important} onChange={setImportant} />
            <span>Importante</span>
          </div>
          <Button type="submit" className="ml-auto" disabled={!typed || !currentCategory}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
      </form>
    </Card>
  );
}
