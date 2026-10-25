import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function NewCategoryForm({ onAdd }: { onAdd: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim() && (await onAdd(name.trim()))) setName("");
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex gap-2">
      <Input
        placeholder="Nova categoria…"
        aria-label="Nome da nova categoria"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" variant="secondary" disabled={!name.trim()} className="shrink-0">
        <Plus size={16} /> Categoria
      </Button>
    </form>
  );
}
