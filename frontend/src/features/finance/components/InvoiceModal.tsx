import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { financeRepository, type Card, type Invoice } from "@/data/repositories/financeRepository";
import { useApiData } from "@/hooks/useApiData";
import { formatBRL } from "@/lib/format";
import { dayMonth, monthLabel, shiftMonth } from "../utils/months";

/** Closing date editor; `key={month}` on the parent restarts it when the month changes. */
function Closing({
  invoice,
  onConfirm,
}: {
  invoice: Invoice;
  onConfirm: (closingDate: string) => void;
}) {
  const [date, setDate] = useState(invoice.closingDate);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Fechamento</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <Button variant="secondary" disabled={!date} onClick={() => onConfirm(date)}>
          {invoice.confirmed ? "Atualizar data" : "Confirmar data"}
        </Button>
      </div>
      {!invoice.confirmed && (
        <p className="flex items-center gap-1.5 text-sm text-primary">
          <AlertTriangle size={14} /> Confira a data de fechamento deste mês e edite se preciso.
        </p>
      )}
    </div>
  );
}

interface Props {
  card: Card;
  initialMonth: string;
  onClose: () => void;
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

export default function InvoiceModal({ card, initialMonth, onClose, onChange }: Props) {
  const [month, setMonth] = useState(initialMonth);
  const { data: invoice, error, reload } = useApiData(`invoice:${card.id}:${month}`, () =>
    financeRepository.getInvoice(card.id, month)
  );

  async function change(action: () => Promise<unknown>) {
    if (await onChange(action)) reload();
  }

  return (
    <FormModal titulo={card.name} onClose={onClose}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Fatura anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft size={18} />
        </Button>
        <div className="flex-1 text-center">
          <p className="font-medium capitalize">Fatura de {monthLabel(month)}</p>
          {invoice?.month === month && (
            <p className="text-xs text-muted">Vence em {format(parseISO(invoice.dueDate), "dd/MM/yyyy")}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="Próxima fatura" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight size={18} />
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!invoice || invoice.month !== month ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg border border-border bg-bg p-3">
            <div>
              <p className="text-sm text-muted">Total da fatura</p>
              <p className="text-2xl font-semibold tabular-nums">{formatBRL(invoice.total)}</p>
            </div>
            {invoice.paid && <Badge variant="primary">Paga</Badge>}
          </div>

          <Closing
            key={month}
            invoice={invoice}
            onConfirm={(date) => void change(() => financeRepository.confirmClosing(card.id, month, date))}
          />

          <div>
            <h3 className="mb-2 text-sm font-medium">Lançamentos</h3>
            {invoice.transactions.length === 0 ? (
              <p className="text-sm text-muted">Nenhum lançamento nesta fatura.</p>
            ) : (
              <ul className="divide-y divide-border">
                {invoice.transactions.map((t) => (
                  <li key={t.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      {t.title}
                      {t.installmentNumber && ` — parcela ${t.installmentNumber}/${t.installmentTotal}`}
                      <span className="ml-2 text-xs text-muted">{dayMonth(t.day)}</span>
                    </span>
                    <span className="tabular-nums">{formatBRL(t.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            variant={invoice.paid ? "secondary" : "primary"}
            onClick={() => void change(() => financeRepository.setInvoicePaid(card.id, month, !invoice.paid))}
          >
            {invoice.paid ? "Desmarcar como paga" : "Marcar fatura como paga"}
          </Button>
          <p className="text-xs text-muted">
            Pagar a fatura não cria uma despesa nova: os gastos já foram lançados.
          </p>
        </>
      )}
    </FormModal>
  );
}
