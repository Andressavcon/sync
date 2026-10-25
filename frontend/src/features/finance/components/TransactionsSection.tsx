import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  financeRepository,
  type CardSummary,
  type Transaction,
} from "@/data/repositories/financeRepository";
import { useApiData } from "@/hooks/useApiData";
import { formatBRL } from "@/lib/format";
import { currentMonth, dayMonth, monthBounds, monthLabel, shiftMonth } from "../utils/months";
import TransactionModal from "./TransactionModal";

type Filter = "all" | "income" | "expense";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "income", label: "Entradas" },
  { id: "expense", label: "Saídas" },
];

interface Props {
  cards: CardSummary[];
  version: number;
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

export default function TransactionsSection({ cards, version, onChange }: Props) {
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<Filter>("all");
  const [form, setForm] = useState<Transaction | "new" | null>(null);
  const [start, end] = monthBounds(month);
  const { data, error } = useApiData(`transactions:${month}:${version}`, () =>
    financeRepository.listTransactions(start, end)
  );

  const list = (data ?? []).filter((t) => filter === "all" || t.kind === filter);
  const cardName = (id: string | null) => cards.find((c) => c.card.id === id)?.card.name ?? "Cartão";
  const methodLabel = (t: Transaction) =>
    t.kind === "income" ? "Receita" : t.paymentMethod === "card" ? cardName(t.cardId) : t.paymentMethod === "pix" ? "Pix" : "Boleto";

  // Active cards, plus the edited transaction's card even if archived
  const editing = form && form !== "new" ? form : undefined;
  const usableCards = cards
    .filter((c) => !c.card.archived || c.card.id === editing?.cardId)
    .map((c) => c.card);

  return (
    <Card>
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft size={16} />
        </Button>
        <h2 className="text-lg font-semibold first-letter:uppercase">{monthLabel(month)}</h2>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight size={16} />
        </Button>
        <div className="ml-auto flex gap-1" role="group" aria-label="Filtro">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={[
                "rounded-full border px-3 py-1 text-sm transition-colors",
                filter === f.id
                  ? "border-primary bg-primary text-bg"
                  : "border-border text-muted hover:bg-surface-hover hover:text-text",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setForm("new")}>
          <Plus size={16} /> Novo lançamento
        </Button>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{data ? "Nenhum lançamento neste mês." : "Carregando…"}</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setForm(t)}
                className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {t.title}
                    {t.installmentNumber && ` — parcela ${t.installmentNumber}/${t.installmentTotal}`}
                  </p>
                  <p className="text-xs text-muted">
                    {dayMonth(t.day)} · {methodLabel(t)}
                  </p>
                </div>
                <span className={`tabular-nums ${t.kind === "income" ? "text-primary" : ""}`}>
                  {t.kind === "income" ? "+" : "−"} {formatBRL(t.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <TransactionModal
          transaction={editing}
          cards={usableCards}
          onClose={() => setForm(null)}
          onChange={onChange}
        />
      )}
    </Card>
  );
}
