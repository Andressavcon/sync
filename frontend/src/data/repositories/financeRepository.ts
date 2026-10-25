import { api } from "@/data/api";

// ---------- Types (mirror app/modules/finance/schemas.py) ----------

export type TransactionKind = "income" | "expense";
export type PaymentMethod = "card" | "pix" | "boleto";
export type Scope = "this" | "following";

export interface Card {
  id: string;
  name: string;
  dueDay: number;
  closingDay: number;
  /** Purchase on the closing day goes to the next invoice */
  closingDayPurchaseGoesNext: boolean;
  archived: boolean;
}

export interface CardSummary {
  card: Card;
  currentInvoice: { month: string; dueDate: string; total: number; needsCheck: boolean };
  futureCommitted: number;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  title: string;
  /** In installments: the value of one installment */
  amount: number;
  day: string;
  paymentMethod: PaymentMethod;
  cardId: string | null;
  invoiceMonth: string | null;
  installmentGroup: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  countInAvailable: boolean;
}

export interface TransactionInput {
  kind: TransactionKind;
  title: string;
  amount: number;
  day: string;
  paymentMethod: PaymentMethod;
  cardId?: string | null;
  invoiceMonth?: string | null;
  countInAvailable?: boolean;
}

export interface InstallmentInput {
  title: string;
  installmentAmount: number;
  installments: number;
  day: string;
  cardId: string;
  invoiceMonth?: string | null;
}

export interface Invoice {
  cardId: string;
  month: string;
  dueDate: string;
  closingDate: string;
  confirmed: boolean;
  paid: boolean;
  paidAt: string | null;
  total: number;
  transactions: Transaction[];
}

export interface FixedBill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
}

export interface FixedBillOfMonth {
  bill: FixedBill;
  month: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAt: string | null;
}

export interface FixedBillsMonth {
  month: string;
  bills: FixedBillOfMonth[];
  pendingTotal: number;
}

export interface Pot {
  id: string;
  name: string;
  balance: number;
}

export interface Salary {
  amount: number;
  day: number;
  configured: boolean;
}

export interface Available {
  cycleStart: string;
  cycleLastDay: string;
  daysLeft: number;
  salary: number;
  fixedBills: number;
  invoices: number;
  oneOffExpenses: number;
  saved: number;
  extraIncome: number;
  total: number;
  weeksLeft: number;
  perWeek: number;
}

export interface MonthSummary {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

// ---------- Calls ----------

const BASE = "/api/finance";

export const financeRepository = {
  listCards: () => api.get<CardSummary[]>(`${BASE}/cards`),
  createCard: (input: Omit<Card, "id" | "archived">) => api.post<Card>(`${BASE}/cards`, input),
  updateCard: (id: string, changes: Partial<Omit<Card, "id">>) =>
    api.patch<Card>(`${BASE}/cards/${id}`, changes),
  deleteCard: (id: string) => api.delete(`${BASE}/cards/${id}`),
  suggestedInvoice: (cardId: string, day: string) =>
    api.get<{ month: string; dueDate: string }>(`${BASE}/cards/${cardId}/suggested-invoice`, { day }),

  getInvoice: (cardId: string, month: string) =>
    api.get<Invoice>(`${BASE}/cards/${cardId}/invoices/${month}`),
  confirmClosing: (cardId: string, month: string, closingDate: string) =>
    api.put<Invoice>(`${BASE}/cards/${cardId}/invoices/${month}/closing`, { closingDate }),
  setInvoicePaid: (cardId: string, month: string, paid: boolean) =>
    api.put<Invoice>(`${BASE}/cards/${cardId}/invoices/${month}/paid`, { paid }),

  listTransactions: (start: string, end: string) =>
    api.get<Transaction[]>(`${BASE}/transactions`, { start, end, limit: "500" }),
  createTransaction: (input: TransactionInput) =>
    api.post<Transaction>(`${BASE}/transactions`, input),
  createInstallments: (input: InstallmentInput) =>
    api.post<Transaction[]>(`${BASE}/transactions/installments`, input),
  updateTransaction: (id: string, changes: Partial<TransactionInput>, scope: Scope = "this") =>
    api.patch<Transaction>(`${BASE}/transactions/${id}`, changes, { scope }),
  deleteTransaction: (id: string, scope: Scope = "this") =>
    api.delete(`${BASE}/transactions/${id}`, { scope }),

  billsOfMonth: (month: string) => api.get<FixedBillsMonth>(`${BASE}/fixed-bills`, { month }),
  createBill: (input: Omit<FixedBill, "id">) => api.post<FixedBill>(`${BASE}/fixed-bills`, input),
  updateBill: (id: string, changes: Partial<Omit<FixedBill, "id">>) =>
    api.patch<FixedBill>(`${BASE}/fixed-bills/${id}`, changes),
  deleteBill: (id: string) => api.delete(`${BASE}/fixed-bills/${id}`),
  updateBillMonth: (id: string, month: string, changes: { amount?: number; paid?: boolean }) =>
    api.put<FixedBillOfMonth>(`${BASE}/fixed-bills/${id}/months/${month}`, changes),

  listPots: () => api.get<{ pots: Pot[]; total: number }>(`${BASE}/pots`),
  createPot: (name: string) => api.post<Pot>(`${BASE}/pots`, { name }),
  renamePot: (id: string, name: string) => api.patch<Pot>(`${BASE}/pots/${id}`, { name }),
  deletePot: (id: string) => api.delete(`${BASE}/pots/${id}`),
  deposit: (id: string, amount: number) => api.post<Pot>(`${BASE}/pots/${id}/deposit`, { amount }),
  withdraw: (id: string, amount: number) => api.post<Pot>(`${BASE}/pots/${id}/withdraw`, { amount }),
  setPotBalance: (id: string, balance: number) =>
    api.put<Pot>(`${BASE}/pots/${id}/balance`, { balance }),

  getSalary: () => api.get<Salary>(`${BASE}/salary`),
  setSalary: (amount: number, day: number) => api.put<Salary>(`${BASE}/salary`, { amount, day }),
  getAvailable: () => api.get<Available>(`${BASE}/available`),
  monthSummary: (month: string) => api.get<MonthSummary>(`${BASE}/summary`, { month }),
};
