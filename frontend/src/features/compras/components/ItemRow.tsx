import { useState } from "react";
import { Check, Pencil, Star, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import { fieldClass } from "@/lib/ui";
import { useCompras } from "../hooks/useCompras";
import type { Item } from "../types";

interface Props {
  item: Item;
  /** Mostrado na seção Importante, onde itens de várias categorias se misturam */
  categoriaNome?: string;
}

export default function ItemRow({ item, categoriaNome }: Props) {
  const { categorias, toggleComprado, updateItem, removeItem } = useCompras();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(item.nome);
  const [quantidade, setQuantidade] = useState(item.quantidade);
  const [categoriaId, setCategoriaId] = useState(item.categoriaId);

  function abrirEdicao() {
    setNome(item.nome);
    setQuantidade(item.quantidade);
    setCategoriaId(item.categoriaId);
    setEditando(true);
  }

  function salvar() {
    if (!nome.trim()) return;
    updateItem(item.id, { nome: nome.trim(), quantidade: quantidade.trim(), categoriaId });
    setEditando(false);
  }

  if (editando) {
    return (
      <li className="flex flex-col gap-2 py-2">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label="Nome do item"
          autoFocus
        />
        <div className="flex gap-2">
          <Input
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="Quantidade"
            aria-label="Quantidade"
          />
          <select
            className={fieldClass}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            aria-label="Categoria"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditando(false)}>
            <X size={16} /> Cancelar
          </Button>
          <Button onClick={salvar} disabled={!nome.trim()}>
            <Check size={16} /> Salvar
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <Checkbox
        label={`Marcar ${item.nome} como comprado`}
        checked={item.comprado}
        onChange={() => toggleComprado(item.id)}
      />
      <div className="min-w-0 flex-1">
        <p className={item.comprado ? "text-muted line-through" : ""}>
          {item.nome}
          {item.quantidade && (
            <span className="ml-2 text-sm text-muted">{item.quantidade}</span>
          )}
        </p>
        {categoriaNome && <p className="text-xs text-muted">{categoriaNome}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={item.importante ? "Tirar de importante" : "Marcar como importante"}
        onClick={() => updateItem(item.id, { importante: !item.importante })}
      >
        <Star size={16} className={item.importante ? "fill-primary text-primary" : ""} />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Editar item" onClick={abrirEdicao}>
        <Pencil size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Excluir item"
        onClick={() => removeItem(item.id)}
      >
        <Trash2 size={16} />
      </Button>
    </li>
  );
}
