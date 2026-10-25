import { useState } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { ApiError } from "@/data/api";
import { financeRepository, type Card, type CardSummary } from "@/data/repositories/financeRepository";
import { formatBRL } from "@/lib/format";
import { dayMonth } from "../utils/months";
import CardFormModal from "./CardFormModal";
import InvoiceModal from "./InvoiceModal";

interface Props {
  cards: CardSummary[];
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

export default function CardsSection({ cards, onChange }: Props) {
  const [form, setForm] = useState<Card | "new" | null>(null);
  const [open, setOpen] = useState<CardSummary | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = cards.filter((c) => !c.card.archived);
  const archived = cards.filter((c) => c.card.archived);

  async function remove(card: Card) {
    if (!window.confirm(`Excluir o cartão "${card.name}"?`)) return;
    try {
      await financeRepository.deleteCard(card.id);
      await onChange(async () => {});
    } catch (e) {
      // A card with transactions is archived instead of deleted
      if (e instanceof ApiError && e.status === 409) {
        const archive = window.confirm(
          `"${card.name}" já tem lançamentos ou parcelas. Arquivar (esconder e manter o histórico)?`
        );
        if (archive) await onChange(() => financeRepository.updateCard(card.id, { archived: true }));
      } else {
        await onChange(() => Promise.reject(e));
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cartões</h2>
        <Button onClick={() => setForm("new")}>
          <Plus size={16} /> Novo cartão
        </Button>
      </div>

      {active.length === 0 && <p className="text-sm text-muted">Nenhum cartão cadastrado.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {active.map((summary) => {
          const { card, currentInvoice, futureCommitted } = summary;
          return (
            <div key={card.id} className="glass rounded-3xl p-5">
              <div className="flex items-start gap-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(summary)}>
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    {card.name}
                    {currentInvoice.needsCheck && (
                      <span title="Conferir a data de fechamento" className="text-primary">
                        <AlertTriangle size={16} />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    Fatura atual · vence em {dayMonth(currentInvoice.dueDate)}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{formatBRL(currentInvoice.total)}</p>
                  <p className="mt-1 text-xs text-muted">
                    Comprometido nas faturas futuras: {formatBRL(futureCommitted)}
                  </p>
                </button>
                <Button variant="ghost" size="icon" aria-label="Editar cartão" onClick={() => setForm(card)}>
                  <Pencil size={16} />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Excluir cartão" onClick={() => void remove(card)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {archived.length > 0 && (
        <div>
          <Button variant="ghost" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Esconder" : "Ver"} arquivados ({archived.length})
          </Button>
          {showArchived && (
            <ul className="mt-2 flex flex-col gap-2">
              {archived.map(({ card }) => (
                <li key={card.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                  <span className="text-muted">{card.name}</span>
                  <Button
                    variant="secondary"
                    onClick={() => void onChange(() => financeRepository.updateCard(card.id, { archived: false }))}
                  >
                    Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {form && (
        <CardFormModal card={form === "new" ? undefined : form} onClose={() => setForm(null)} onChange={onChange} />
      )}
      {open && (
        <InvoiceModal
          card={open.card}
          initialMonth={open.currentInvoice.month}
          onClose={() => setOpen(null)}
          onChange={onChange}
        />
      )}
    </div>
  );
}
