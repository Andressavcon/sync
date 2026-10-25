import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useCompras } from "../hooks/useCompras";

export default function NovaCategoriaForm() {
  const addCategoria = useCompras((s) => s.addCategoria);
  const [nome, setNome] = useState("");

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    addCategoria(nome.trim());
    setNome("");
  }

  return (
    <form onSubmit={enviar} className="flex gap-2">
      <Input
        placeholder="Nova categoria…"
        aria-label="Nome da nova categoria"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <Button type="submit" variant="secondary" disabled={!nome.trim()} className="shrink-0">
        <Plus size={16} /> Categoria
      </Button>
    </form>
  );
}
