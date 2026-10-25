import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import { fieldClass } from "@/lib/ui";
import { useCompras } from "../hooks/useCompras";

export default function AddItemForm() {
  const { categorias, addItem } = useCompras();
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [importante, setImportante] = useState(false);

  // Se a categoria escolhida foi excluída, cai para a primeira
  const categoriaAtual = categorias.some((c) => c.id === categoriaId)
    ? categoriaId
    : (categorias[0]?.id ?? "");

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !categoriaAtual) return;
    addItem({
      nome: nome.trim(),
      quantidade: quantidade.trim(),
      categoriaId: categoriaAtual,
      importante,
    });
    setNome("");
    setQuantidade("");
    setImportante(false);
  }

  return (
    <Card>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="flex-1"
            placeholder="Adicionar item…"
            aria-label="Nome do item"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Input
            className="sm:w-36"
            placeholder="Qtd. (opcional)"
            aria-label="Quantidade"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className={`${fieldClass} sm:w-auto`}
            aria-label="Categoria"
            value={categoriaAtual}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            {categorias.length === 0 && <option value="">Crie uma categoria</option>}
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox label="Importante" checked={importante} onChange={setImportante} />
            <span>Importante</span>
          </div>
          <Button type="submit" className="ml-auto" disabled={!nome.trim() || !categoriaAtual}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
      </form>
    </Card>
  );
}
