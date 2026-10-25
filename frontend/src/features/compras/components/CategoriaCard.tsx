import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useCompras } from "../hooks/useCompras";
import { ordenarPorComprado } from "../utils/ordenar";
import type { Categoria, Item } from "../types";
import ItemRow from "./ItemRow";

interface Props {
  categoria: Categoria;
  /** Só os itens comuns: os importantes ficam na seção do topo */
  itens: Item[];
}

export default function CategoriaCard({ categoria, itens }: Props) {
  const { renameCategoria, removeCategoria } = useCompras();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);

  function salvar() {
    if (!nome.trim()) return;
    renameCategoria(categoria.id, nome.trim());
    setEditando(false);
  }

  function excluir() {
    if (window.confirm(`Excluir a categoria "${categoria.nome}" e todos os itens dela?`)) {
      removeCategoria(categoria.id);
    }
  }

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        {editando ? (
          <>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-label="Nome da categoria"
              autoFocus
            />
            <Button size="icon" onClick={salvar} aria-label="Salvar" disabled={!nome.trim()}>
              <Check size={16} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Cancelar"
              onClick={() => setEditando(false)}
            >
              <X size={16} />
            </Button>
          </>
        ) : (
          <>
            <h2 className="flex-1 text-lg font-semibold">{categoria.nome}</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Renomear categoria"
              onClick={() => {
                setNome(categoria.nome);
                setEditando(true);
              }}
            >
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Excluir categoria" onClick={excluir}>
              <Trash2 size={16} />
            </Button>
          </>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="py-2 text-sm text-muted">Sem itens.</p>
      ) : (
        <ul className="divide-y divide-border">
          {ordenarPorComprado(itens).map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Card>
  );
}
