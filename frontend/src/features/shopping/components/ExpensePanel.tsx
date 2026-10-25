import { useState, type FormEvent } from "react";
import { format } from "date-fns";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { getErrorMessage } from "@/data/api";
import { financeRepository } from "@/data/repositories/financeRepository";
import { useApiData } from "@/hooks/useApiData";
import { formatBRL, parseBRL } from "@/lib/format";
import { fieldClass } from "@/lib/ui";

/**
 * Registers the market total as an expense in Finance (section 8.4): only the total,
 * no value per item. On a card it goes into the invoice suggested by the date.
 * Registering doesn't clear or complete the list.
 */
export default function ExpensePanel() {
  const cards = useApiData("expense-cards", financeRepository.listCards);
  const activeCards = (cards.data ?? []).filter((c) => !c.card.archived).map((c) => c.card);

  const [title, setTitle] = useState("SUPERMERCADO");
  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState("");
  const [day, setDay] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  // First card by default, once the cards arrive
  const currentMethod = method || (activeCards[0] ? `card:${activeCards[0].id}` : "pix");
  const amount = parseBRL(amountText);
  const valid = title.trim() !== "" && Number.isFinite(amount) && amount > 0 && day !== "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const cardId = currentMethod.startsWith("card:") ? currentMethod.slice(5) : null;
    setSaving(true);
    try {
      const saved = await financeRepository.createTransaction({
        kind: "expense",
        title: title.trim(),
        amount,
        day,
        paymentMethod: cardId ? "card" : (currentMethod as "pix" | "boleto"),
        cardId,
      });
      setMessage({
        text: `Gasto de ${formatBRL(amount)} registrado em Finanças${saved.invoiceMonth ? ", na fatura do cartão" : ""}.`,
        error: false,
      });
      setAmountText("");
    } catch (err) {
      setMessage({ text: getErrorMessage(err), error: true });
    }
    setSaving(false);
  }

  return (
    <Card title="Registrar gasto" description="Informe só o total pago, ao sair do mercado.">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Título</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Valor total</span>
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={amountText}
            onChange={(e) => {
              setAmountText(e.target.value);
              setMessage(null);
            }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Pagamento</span>
          <select className={fieldClass} value={currentMethod} onChange={(e) => setMethod(e.target.value)}>
            {activeCards.map((c) => (
              <option key={c.id} value={`card:${c.id}`}>
                {c.name}
              </option>
            ))}
            <option value="pix">Pix</option>
            <option value="boleto">Boleto</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Data</span>
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>

        <Button type="submit" disabled={!valid || saving}>
          Registrar gasto
        </Button>

        {message && <p className={`text-sm ${message.error ? "text-red-400" : "text-primary"}`}>{message.text}</p>}
        <p className="text-xs text-muted">Registrar não conclui nem limpa a lista.</p>
      </form>
    </Card>
  );
}
