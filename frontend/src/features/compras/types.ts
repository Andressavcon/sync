export interface Categoria {
  id: string;
  nome: string;
}

export interface Item {
  id: string;
  nome: string;
  quantidade: string; // opcional: vazio quando não informada
  categoriaId: string;
  importante: boolean;
  comprado: boolean;
}

export interface ListaArquivada {
  id: string;
  concluidaEm: string; // ISO
  itens: Item[];
}

/** Gasto registrado ao sair do mercado. Mais tarde vira uma despesa em Finanças. */
export interface Gasto {
  id: string;
  titulo: string;
  valor: number;
  meio: string;
  data: string; // yyyy-MM-dd
}
