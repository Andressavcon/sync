import type { Categoria, Item } from "./types";

export const MOCK_CATEGORIAS: Categoria[] = [
  { id: "cat-hortifruti", nome: "Hortifruti" },
  { id: "cat-acougue", nome: "Açougue" },
  { id: "cat-padaria", nome: "Padaria" },
  { id: "cat-laticinios", nome: "Laticínios" },
  { id: "cat-limpeza", nome: "Limpeza" },
];

const item = (
  id: string,
  nome: string,
  categoriaId: string,
  extra: Partial<Item> = {}
): Item => ({ id, nome, quantidade: "", categoriaId, importante: false, comprado: false, ...extra });

export const MOCK_ITENS: Item[] = [
  item("i1", "Banana", "cat-hortifruti", { quantidade: "1 cacho" }),
  item("i2", "Tomate", "cat-hortifruti", { quantidade: "500 g" }),
  item("i3", "Alface", "cat-hortifruti"),
  item("i4", "Frango", "cat-acougue", { quantidade: "1 kg", importante: true }),
  item("i5", "Carne moída", "cat-acougue", { quantidade: "500 g" }),
  item("i6", "Pão francês", "cat-padaria", { quantidade: "6 un" }),
  item("i7", "Leite", "cat-laticinios", { quantidade: "2 L", importante: true }),
  item("i8", "Queijo", "cat-laticinios"),
  item("i9", "Detergente", "cat-limpeza", { comprado: true }),
  item("i10", "Sabão em pó", "cat-limpeza"),
];

/** Mock: depois virá dos cartões cadastrados em Finanças (seção 9). */
export const MEIOS_PAGAMENTO = [
  "Nubank",
  "Banco do Brasil",
  "Banrisul",
  "Mercado Pago",
  "Pix",
  "Boleto",
] as const;
