export interface Cartao {
  id: string;
  nome: string;
  diaVencimento: number;
  /** Fechamento padrão; o do mês pode ser editado na fatura */
  diaFechamento: number;
  arquivado: boolean;
}

/** Só guarda o que foi mexido (fechamento editado, pago). O resto é calculado. */
export interface Fatura {
  id: string;
  cartaoId: string;
  /** Mês do vencimento, yyyy-MM */
  mes: string;
  /** Data de fechamento editada (yyyy-MM-dd) */
  fechamento?: string;
  /** Data de fechamento conferida/editada neste mês (apaga o ícone de alerta) */
  confirmada: boolean;
  paga: boolean;
  pagaEm?: string;
}

export type MeioPagamento =
  | { tipo: "cartao"; cartaoId: string }
  | { tipo: "pix" }
  | { tipo: "boleto" };

export interface Parcela {
  grupoId: string;
  numero: number;
  total: number;
}

export interface Lancamento {
  id: string;
  tipo: "receita" | "despesa";
  titulo: string;
  /** Em compra parcelada, é o valor da parcela */
  valor: number;
  data: string; // yyyy-MM-dd
  meio: MeioPagamento;
  /** Fatura (mês do vencimento) em que a despesa de cartão cai */
  faturaMes?: string;
  parcela?: Parcela;
  /** Receita extra: conta ou não no disponível do ciclo (salário sempre conta) */
  contabilizar?: boolean;
}

export interface ContaFixa {
  id: string;
  nome: string;
  valor: number; // valor cadastrado
  diaVencimento: number;
}

/** Ocorrência mensal de uma conta fixa. Só existe depois de ser editada ou paga. */
export interface ContaFixaMes {
  contaId: string;
  mes: string; // yyyy-MM
  valor: number;
  pago: boolean;
  pagoEm?: string;
}

export interface Pote {
  id: string;
  nome: string;
  valor: number;
}

/** Guardar/retirar ficam registrados só para o cálculo do ciclo (a tela não mostra histórico). */
export interface MovimentoPote {
  id: string;
  poteId: string;
  tipo: "guardar" | "retirar";
  valor: number;
  data: string; // yyyy-MM-dd
}

export interface Salario {
  valor: number;
  /** Dia do mês em que cai: define o início do ciclo */
  dia: number;
}

export interface DadosFinancas {
  cartoes: Cartao[];
  faturas: Fatura[];
  lancamentos: Lancamento[];
  contasFixas: ContaFixa[];
  contasMes: ContaFixaMes[];
  potes: Pote[];
  movimentos: MovimentoPote[];
  salario: Salario;
}

/** Editar/excluir parcela: só esta ou esta e as próximas (seção 9.4) */
export type Escopo = "esta" | "proximas";
