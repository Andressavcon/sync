import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import {
  financeRepository,
  type Card,
  type Scope,
  type Transaction,
  type TransactionInput,
  type TransactionKind,
} from "@/data/repositories/financeRepository";
import { useApiData } from "@/hooks/useApiData";
import { parseBRL } from "@/lib/format";
import { fieldClass } from "@/lib/ui";
import { shiftMonth, shortMonthLabel } from "../utils/months";

interface Props {
  /** No transaction = creating a new one */
  transaction?: Transaction;
  /** Cards that can be chosen (active ones, plus the transaction's own card) */
  cards: Card[];
  onClose: () => void;
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

export default function TransactionModal({ transaction, cards, onClose, onChange }: Props) {
  const isInstallment = transaction?.installmentNumber != null;

  const [kind, setKind] = useState<TransactionKind>(transaction?.kind ?? "expense");
  const [title, setTitle] = useState(transaction?.title ?? "");
  const [amountText, setAmountText] = useState(transaction ? String(transaction.amount).replace(".", ",") : "");
  const [day, setDay] = useState(transaction?.day ?? format(new Date(), "yyyy-MM-dd"));
  const [method, setMethod] = useState(
    transaction
      ? transaction.paymentMethod === "card"
        ? `card:${transaction.cardId}`
        : transaction.paymentMethod
      : cards[0]
        ? `card:${cards[0].id}`
        : "pix"
  );
  const [installments, setInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [chosenInvoice, setChosenInvoice] = useState<string | null>(transaction?.invoiceMonth ?? null);
  const [countInAvailable, setCountInAvailable] = useState(transaction?.countInAvailable ?? false);
  const [askScopeFor, setAskScopeFor] = useState<"save" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);

  const amount = parseBRL(amountText);
  const validDay = isValid(parseISO(day));
  const card = method.startsWith("card:") ? cards.find((c) => c.id === method.slice(5)) : undefined;
  const onCard = kind === "expense" && !!card;

  // Invoice suggested by the purchase date (the backend knows the closing dates)
  const suggestion = useApiData(onCard && validDay ? `suggest:${card.id}:${day}` : "none", () =>
    onCard && validDay ? financeRepository.suggestedInvoice(card.id, day) : Promise.resolve(null)
  ).data;
  const invoiceMonth = onCard ? (chosenInvoice ?? suggestion?.month ?? null) : null;
  const invoiceOptions = suggestion
    ? [...new Set([invoiceMonth, ...[-1, 0, 1, 2].map((k) => shiftMonth(suggestion.month, k))])]
        .filter((m): m is string => m !== null)
        .sort()
    : [];

  const count = Number(installmentCount);
  const valid =
    title.trim() !== "" &&
    Number.isFinite(amount) &&
    amount > 0 &&
    validDay &&
    (kind === "income" || method !== "") &&
    (!installments || (Number.isInteger(count) && count >= 2 && count <= 72));

  function input(): TransactionInput {
    return {
      kind,
      title: title.trim(),
      amount,
      day,
      paymentMethod: kind === "income" ? "pix" : card ? "card" : (method as "pix" | "boleto"),
      cardId: onCard ? card.id : null,
      invoiceMonth,
      countInAvailable: kind === "income" && countInAvailable,
    };
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    if (await onChange(action)) onClose();
    else {
      setBusy(false);
      setAskScopeFor(null);
    }
  }

  function save() {
    if (!valid || busy) return;
    if (transaction && isInstallment) return setAskScopeFor("save");
    if (transaction) return void run(() => financeRepository.updateTransaction(transaction.id, input()));
    if (installments && onCard) {
      return void run(() =>
        financeRepository.createInstallments({
          title: title.trim(),
          installmentAmount: amount,
          installments: count,
          day,
          cardId: card.id,
          invoiceMonth,
        })
      );
    }
    void run(() => financeRepository.createTransaction(input()));
  }

  function remove() {
    if (!transaction) return;
    if (isInstallment) setAskScopeFor("delete");
    else if (window.confirm(`Excluir "${transaction.title}"?`)) {
      void run(() => financeRepository.deleteTransaction(transaction.id));
    }
  }

  function applyScope(scope: Scope) {
    if (!transaction) return;
    if (askScopeFor === "save") {
      void run(() =>
        financeRepository.updateTransaction(transaction.id, { title: title.trim(), amount }, scope)
      );
    } else {
      void run(() => financeRepository.deleteTransaction(transaction.id, scope));
    }
  }

  const footer = askScopeFor ? (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-primary p-3">
      <p className="text-sm">
        Compra parcelada. {askScopeFor === "save" ? "Salvar em:" : "Excluir:"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => applyScope("this")} disabled={busy}>
          Só esta parcela
        </Button>
        <Button onClick={() => applyScope("following")} disabled={busy}>
          Esta e as próximas
        </Button>
        <Button variant="ghost" className="ml-auto" onClick={() => setAskScopeFor(null)}>
          Voltar
        </Button>
      </div>
    </div>
  ) : (
    <>
      {transaction && (
        <Button variant="ghost" onClick={remove} disabled={busy}>
          <Trash2 size={16} /> Excluir
        </Button>
      )}
      <Button variant="secondary" className="ml-auto" onClick={onClose}>
        Cancelar
      </Button>
      <Button onClick={save} disabled={!valid || busy}>
        Salvar
      </Button>
    </>
  );

  return (
    <FormModal titulo={transaction ? "Editar lançamento" : "Novo lançamento"} onClose={onClose} rodape={footer}>
      {isInstallment && (
        <p className="rounded-xl border border-border bg-inset p-3 text-sm text-muted">
          Parcela {transaction?.installmentNumber}/{transaction?.installmentTotal}. Aqui dá para mudar o título e o
          valor; ao salvar, você escolhe se vale só para esta ou também para as próximas.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            disabled={!!transaction}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={[
              "rounded-xl border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              kind === k ? "border-primary bg-primary text-bg" : "border-border text-muted hover:bg-surface-hover",
            ].join(" ")}
          >
            {k === "expense" ? "Despesa" : "Receita"}
          </button>
        ))}
      </div>

      <Field rotulo="Descrição">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!transaction} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field rotulo={installments ? "Valor da parcela" : "Valor"}>
          <Input inputMode="decimal" placeholder="0,00" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
        </Field>
        <Field rotulo="Data">
          <Input
            type="date"
            value={day}
            disabled={isInstallment}
            onChange={(e) => {
              setDay(e.target.value);
              setChosenInvoice(null);
            }}
          />
        </Field>
      </div>

      {kind === "expense" && (
        <Field rotulo="Meio de pagamento">
          <select
            className={fieldClass}
            value={method}
            disabled={isInstallment}
            onChange={(e) => {
              setMethod(e.target.value);
              setChosenInvoice(null);
            }}
          >
            {cards.map((c) => (
              <option key={c.id} value={`card:${c.id}`}>
                {c.name}
              </option>
            ))}
            <option value="pix">Pix</option>
            <option value="boleto">Boleto</option>
          </select>
        </Field>
      )}

      {onCard && !isInstallment && (
        <>
          <Field rotulo="Fatura" dica="Sugerida pela data da compra; você pode trocar.">
            <select
              className={fieldClass}
              value={invoiceMonth ?? ""}
              onChange={(e) => setChosenInvoice(e.target.value)}
            >
              {invoiceOptions.length === 0 && <option value="">Calculando…</option>}
              {invoiceOptions.map((m) => (
                <option key={m} value={m}>
                  {shortMonthLabel(m)}
                  {m === suggestion?.month && " (sugerida)"}
                </option>
              ))}
            </select>
          </Field>

          {!transaction && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Checkbox label="Compra parcelada" checked={installments} onChange={setInstallments} />
                <span>Compra parcelada</span>
              </div>
              {installments && (
                <Field rotulo="Número de parcelas">
                  <Input
                    className="w-28"
                    inputMode="numeric"
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                  />
                </Field>
              )}
            </div>
          )}
        </>
      )}

      {kind === "income" && (
        <div className="flex items-start gap-2 text-sm">
          <Checkbox label="Contabilizar no disponível" checked={countInAvailable} onChange={setCountInAvailable} />
          <span>
            Contabilizar no disponível do ciclo
            <span className="block text-xs text-muted">
              Desmarcado, o valor fica de fora e dá para guardá-lo sem misturar com o salário.
            </span>
          </span>
        </div>
      )}
    </FormModal>
  );
}
