import type { ShoppingItem, ShoppingList } from "@/data/repositories/shoppingRepository";

/** Same rule as the backend: checked items go to the end; unchecked go back before them. */
function moveCheck(items: ShoppingItem[], itemId: string, purchased: boolean): ShoppingItem[] {
  const target = items.find((i) => i.id === itemId);
  if (!target) return items;

  const rest = items.filter((i) => i.id !== itemId);
  const updated = { ...target, purchased };
  if (purchased) return [...rest, updated];

  const firstChecked = rest.findIndex((i) => i.purchased);
  const at = firstChecked === -1 ? rest.length : firstChecked;
  return [...rest.slice(0, at), updated, ...rest.slice(at)];
}

function findItem(list: ShoppingList, itemId: string): ShoppingItem | undefined {
  return [...list.important, ...list.categories.flatMap((c) => c.items)].find(
    (i) => i.id === itemId
  );
}

/** The list with one item checked/unchecked, computed locally (works offline). */
export function applyCheck(list: ShoppingList, itemId: string, purchased: boolean): ShoppingList {
  const item = findItem(list, itemId);
  if (!item || item.purchased === purchased) return list;

  return {
    ...list,
    important: moveCheck(list.important, itemId, purchased),
    categories: list.categories.map((c) => ({ ...c, items: moveCheck(c.items, itemId, purchased) })),
    purchasedItems: list.purchasedItems + (purchased ? 1 : -1),
  };
}
