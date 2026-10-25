import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import Field from "@/components/ui/Field";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { financeRepository, type FixedBill } from "@/data/repositories/financeRepository";
import { useApiData } from "@/hooks/useApiData";
import { formatBRL, parseBRL } from "@/lib/format";
import { fieldClass } from "@/lib/ui";
import { DAYS_OF_MONTH, currentMonth, dayMonth, monthLabel, shiftMonth } from "../utils/months";

type Change = (action: () => Promise<unknown>) => Promise<boolean>;

function BillFormModal({ bill, onClose, onChange }: { bill?: FixedBill; onClose: () => void; onChange: Change }) {
  const [name, setName] = useState(bill?.name ?? "");
  const [amountText, setAmountText] = useState(bill ? String(bill.amount).replace(".", ",") : "");
  const [dueDay, setDueDay] = useState(bill?.dueDay ?? 10);
  const amount = parseBRL(amountText);
  const valid = name.trim() !== "" && Number.isFinite(amount) && amount > 0;

  async function save() {
    const input = { name: name.trim(), amount, dueDay };
    const ok = await onChange(() => (bill ? financeRepository.updateBill(bill.id, input) : financeRepository.createBill(input)));
    if (ok) onClose();
  }

  return (
    <FormModal
      titulo={bill ? "Editar conta fixa" : "Nova conta fixa"}
      onClose={onClose}
      rodape={
        <>
          <Button variant="secondary" className="ml-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={!valid}>
            Salvar
          </Button>
        </>
      }
    >
      <Field rotulo="Nome">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!bill} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field rotulo="Valor cadastrado" dica="Pode ser ajustado em cada mês.">
          <Input inputMode="decimal" placeholder="0,00" value={amountText} onChange={(e) => setAmountText(e.target.value)} />
        </Field>
        <Field rotulo="Vencimento">
          <select className={fieldClass} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}>
            {DAYS_OF_MONTH.map((d) => (
              <option key={d} value={d}>
                Dia {d}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </FormModal>
  );
}

export default function FixedBillsSection({ version, onChange }: { version: number; onChange: Change }) {
  const [month, setMonth] = useState(currentMonth);
  const [form, setForm] = useState<FixedBill | "new" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [valueText, setValueText] = useState("");
  const { data, error } = useApiData(`bills:${month}:${version}`, () => financeRepository.billsOfMonth(month));

  async function saveValue(billId: string) {
    const value = parseBRL(valueText);
    if (Number.isFinite(value) && value >= 0) {
      await onChange(() => financeRepository.updateBillMonth(billId, month, { amount: value }));
    }
    setEditingId(null);
  }

  return (
    <Card>
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft size={16} />
        </Button>
        <h2 className="text-lg font-semibold first-letter:uppercase">Contas fixas · {monthLabel(month)}</h2>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight size={16} />
        </Button>
        <Button className="ml-auto" onClick={() => setForm("new")}>
          <Plus size={16} /> Nova conta
        </Button>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!data ? (
        <p className="py-4 text-center text-sm text-muted">Carregando…</p>
      ) : data.bills.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Nenhuma conta fixa cadastrada.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.bills.map(({ bill, amount, dueDate, paid }) => (
            <li key={bill.id} className="flex flex-wrap items-center gap-3 py-3">
              <Checkbox
                label={`Marcar ${bill.name} como paga`}
                checked={paid}
                onChange={(value) => void onChange(() => financeRepository.updateBillMonth(bill.id, month, { paid: value }))}
              />
              <div className="min-w-0 flex-1 basis-32">
                <p className={paid ? "text-muted line-through" : "font-medium"}>{bill.name}</p>
                <p className="text-xs text-muted">Vence em {dayMonth(dueDate)}</p>
              </div>

              {editingId === bill.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    className="w-28"
                    inputMode="decimal"
                    aria-label="Valor deste mês"
                    value={valueText}
                    onChange={(e) => setValueText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void saveValue(bill.id)}
                    autoFocus
                  />
                  <Button size="icon" aria-label="Salvar valor" onClick={() => void saveValue(bill.id)}>
                    <Check size={16} />
                  </Button>
                  <Button variant="secondary" size="icon" aria-label="Cancelar" onClick={() => setEditingId(null)}>
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  title="Editar o valor deste mês"
                  className="tabular-nums hover:text-primary"
                  onClick={() => {
                    setValueText(String(amount).replace(".", ","));
                    setEditingId(bill.id);
                  }}
                >
                  {formatBRL(amount)}
                </button>
              )}

              <Button variant="ghost" size="icon" aria-label="Editar conta" onClick={() => setForm(bill)}>
                <Pencil size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover conta"
                onClick={() => window.confirm(`Remover "${bill.name}"?`) && void onChange(() => financeRepository.deleteBill(bill.id))}
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted">Total pendente neste mês</span>
          <span className="font-semibold tabular-nums">{formatBRL(data.pendingTotal)}</span>
        </p>
      )}

      {form && <BillFormModal bill={form === "new" ? undefined : form} onClose={() => setForm(null)} onChange={onChange} />}
    </Card>
  );
}
