import { useState } from "react";
import { ArrowUpDown, CheckCheck, History, Star, WifiOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  shoppingRepository,
  type ItemInput,
  type ShoppingItem,
} from "@/data/repositories/shoppingRepository";
import AddItemForm from "./components/AddItemForm";
import ArchivesModal from "./components/ArchivesModal";
import CategoryCard from "./components/CategoryCard";
import CategoryOrderModal from "./components/CategoryOrderModal";
import ExpensePanel from "./components/ExpensePanel";
import ItemRow from "./components/ItemRow";
import NewCategoryForm from "./components/NewCategoryForm";
import { useShoppingList } from "./hooks/useShoppingList";

export default function ShoppingPage() {
  const { list, offline, pending, error, check, change } = useShoppingList();
  const [showArchives, setShowArchives] = useState(false);
  const [ordering, setOrdering] = useState(false);

  if (!list) {
    return (
      <p className={`py-10 text-center ${error || offline ? "text-red-400" : "text-muted"}`}>
        {error ?? (offline ? "Sem conexão e nenhuma lista salva neste aparelho." : "Carregando…")}
      </p>
    );
  }

  const categories = list.categories.map((c) => c.category);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  function completeList() {
    const ok = window.confirm(
      "Concluir a lista? Ela vai para as listas anteriores e os itens não marcados passam para a nova lista."
    );
    if (ok) void change(() => shoppingRepository.completeList());
  }

  function deleteCategory(id: string, name: string) {
    if (window.confirm(`Excluir a categoria "${name}" e todos os itens dela?`)) {
      void change(() => shoppingRepository.deleteCategory(id));
    }
  }

  const row = (item: ShoppingItem, showCategory = false) => (
    <ItemRow
      key={item.id}
      item={item}
      categories={categories}
      categoryName={showCategory ? categoryName(item.categoryId) : undefined}
      onCheck={(purchased) => void check(item, purchased)}
      onUpdate={(changes: Partial<ItemInput>) =>
        change(() => shoppingRepository.updateItem(item.id, changes))
      }
      onDelete={() => void change(() => shoppingRepository.deleteItem(item.id))}
    />
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lista de compras</h1>
          <p className="text-sm text-muted">
            {list.purchasedItems} de {list.totalItems} itens comprados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setShowArchives(true)} disabled={offline}>
            <History size={16} /> Listas anteriores
          </Button>
          <Button variant="ghost" onClick={() => setOrdering(true)} disabled={offline}>
            <ArrowUpDown size={16} /> Ordenar categorias
          </Button>
          <Button
            variant="secondary"
            onClick={completeList}
            disabled={offline || list.totalItems === 0}
          >
            <CheckCheck size={16} /> Concluir lista
          </Button>
        </div>
      </div>

      {offline && (
        <p className="flex items-center gap-2 rounded-xl border border-primary/40 px-3 py-2 text-sm text-primary">
          <WifiOff size={16} className="shrink-0" />
          Sem internet: mostrando a última lista salva. Dá para marcar os itens normalmente
          {pending > 0 &&
            ` (${pending} ${pending === 1 ? "marcação será enviada" : "marcações serão enviadas"} quando a conexão voltar)`}
          .
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-400/40 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <AddItemForm
            categories={categories}
            onAdd={(input) => change(() => shoppingRepository.createItem(input))}
          />

          {list.important.length > 0 && (
            <Card>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                <Star size={18} className="fill-primary text-primary" /> Importante
              </h2>
              <ul className="divide-y divide-border">
                {list.important.map((item) => row(item, true))}
              </ul>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            {list.categories.map(({ category, items }) => (
              <CategoryCard
                key={category.id}
                category={category}
                itemCount={items.length}
                onRename={(name) => change(() => shoppingRepository.renameCategory(category.id, name))}
                onDelete={() => deleteCategory(category.id, category.name)}
              >
                {items.map((item) => row(item))}
              </CategoryCard>
            ))}
          </div>

          <NewCategoryForm onAdd={(name) => change(() => shoppingRepository.createCategory(name))} />
        </div>

        <div className="lg:sticky lg:top-20">
          <ExpensePanel />
        </div>
      </div>

      {showArchives && <ArchivesModal onClose={() => setShowArchives(false)} />}
      {ordering && (
        <CategoryOrderModal
          categories={categories}
          onClose={() => setOrdering(false)}
          onSave={(ids) => change(() => shoppingRepository.reorderCategories(ids))}
        />
      )}
    </div>
  );
}
