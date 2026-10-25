import { CheckCheck, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useCompras } from "./hooks/useCompras";
import { ordenarPorComprado } from "./utils/ordenar";
import AddItemForm from "./components/AddItemForm";
import CategoriaCard from "./components/CategoriaCard";
import GastoPanel from "./components/GastoPanel";
import ItemRow from "./components/ItemRow";
import NovaCategoriaForm from "./components/NovaCategoriaForm";

export default function ComprasPage() {
  const { categorias, itens, concluirLista } = useCompras();

  const importantes = ordenarPorComprado(itens.filter((i) => i.importante));
  const comuns = itens.filter((i) => !i.importante);
  const comprados = itens.filter((i) => i.comprado).length;
  const nomeDe = (id: string) => categorias.find((c) => c.id === id)?.nome ?? "";

  function concluir() {
    const ok = window.confirm(
      "Concluir a lista? Ela vai para o arquivo e os itens não marcados passam para a nova lista."
    );
    if (ok) concluirLista();
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lista de compras</h1>
          <p className="text-sm text-muted">
            {comprados} de {itens.length} itens comprados
          </p>
        </div>
        <Button variant="secondary" onClick={concluir} disabled={itens.length === 0}>
          <CheckCheck size={16} /> Concluir lista
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <AddItemForm />

          {importantes.length > 0 && (
            <Card>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                <Star size={18} className="fill-primary text-primary" /> Importante
              </h2>
              <ul className="divide-y divide-border">
                {importantes.map((item) => (
                  <ItemRow key={item.id} item={item} categoriaNome={nomeDe(item.categoriaId)} />
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {categorias.map((c) => (
              <CategoriaCard
                key={c.id}
                categoria={c}
                itens={comuns.filter((i) => i.categoriaId === c.id)}
              />
            ))}
          </div>

          <NovaCategoriaForm />
        </div>

        <div className="lg:sticky lg:top-20">
          <GastoPanel />
        </div>
      </div>
    </div>
  );
}
