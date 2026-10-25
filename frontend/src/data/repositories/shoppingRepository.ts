import { api } from "@/data/api";

// ---------- Types (mirror app/modules/shopping/schemas.py) ----------

export interface ShoppingCategory {
  id: string;
  name: string;
  position: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  categoryId: string;
  important: boolean;
  purchased: boolean;
}

export interface CategoryWithItems {
  category: ShoppingCategory;
  /** Without the important items: they are in the top section */
  items: ShoppingItem[];
}

export interface ShoppingList {
  important: ShoppingItem[];
  categories: CategoryWithItems[];
  totalItems: number;
  purchasedItems: number;
}

export interface ArchivedItem {
  name: string;
  quantity: string;
  categoryName: string;
  important: boolean;
  purchased: boolean;
}

export interface ArchivedList {
  id: string;
  completedAt: string;
  items: ArchivedItem[];
}

export interface ItemInput {
  name: string;
  quantity: string;
  categoryId: string;
  important: boolean;
}

// ---------- Calls ----------

const BASE = "/api/shopping";

export const shoppingRepository = {
  getList: () => api.get<ShoppingList>(`${BASE}/list`),
  completeList: () => api.post<ArchivedList>(`${BASE}/list/complete`, undefined),
  listArchives: () => api.get<ArchivedList[]>(`${BASE}/archives`),
  suggestions: (query: string) => api.get<string[]>(`${BASE}/suggestions`, { q: query }),

  createCategory: (name: string) => api.post<ShoppingCategory>(`${BASE}/categories`, { name }),
  renameCategory: (id: string, name: string) =>
    api.patch<ShoppingCategory>(`${BASE}/categories/${id}`, { name }),
  deleteCategory: (id: string) => api.delete(`${BASE}/categories/${id}`),
  reorderCategories: (categoryIds: string[]) =>
    api.put<ShoppingCategory[]>(`${BASE}/categories/order`, { categoryIds }),

  createItem: (input: ItemInput) => api.post<ShoppingItem>(`${BASE}/items`, input),
  updateItem: (id: string, changes: Partial<ItemInput> & { purchased?: boolean }) =>
    api.patch<ShoppingItem>(`${BASE}/items/${id}`, changes),
  deleteItem: (id: string) => api.delete(`${BASE}/items/${id}`),
};
