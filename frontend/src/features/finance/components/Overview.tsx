import { useState } from "react";
import { Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { financeRepository } from "@/data/repositories/financeRepository";
import { useApiData } from "@/hooks/useApiData";
import { formatBRL } from "@/lib/format";
import { currentMonth, dayMonth } from "../utils/months";
import SalaryModal from "./SalaryModal";

function Line({ label, value, sign }: { label: string; value: number; sign: "+" | "−" }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">
        {sign} {formatBRL(value)}
      </dd>
    </div>
  );
}

const negative = (value: number) => (value < 0 ? "text-red-400" : "");

interface Props {
  /** Changes whenever something in Finance changes, to recalculate */
  version: number;
  onChange: (action: () => Promise<unknown>) => Promise<boolean>;
}

/** Money available to spend (section 9.6) and the month summary. */
export default function Overview({ version, onChange }: Props) {
  const month = currentMonth();
  const available = useApiData(`available:${version}`, financeRepository.getAvailable);
  const summary = useApiData(`summary:${month}:${version}`, () => financeRepository.monthSummary(month));
  const salary = useApiData(`salary:${version}`, financeRepository.getSalary);
  const [editingSalary, setEditingSalary] = useState(false);

  const a = available.data;
  const m = summary.data;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          {!a ? (
            <p className="text-sm text-muted">{available.error ?? "Calculando…"}</p>
          ) : (
            <>
              {salary.data && !salary.data.configured && (
                <p className="mb-3 rounded-xl border border-primary/40 px-3 py-2 text-sm text-primary">
                  Cadastre o salário para o app calcular quanto dá para gastar.
                </p>
              )}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">Disponível para gastar no ciclo</p>
                  <p className={`text-4xl font-semibold tabular-nums ${negative(a.total)}`}>{formatBRL(a.total)}</p>
                  <p className="mt-1 text-sm text-muted">
                    Ciclo de {dayMonth(a.cycleStart)} a {dayMonth(a.cycleLastDay)} · {a.daysLeft}{" "}
                    {a.daysLeft === 1 ? "dia" : "dias"} restantes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">Disponível da semana</p>
                  <p className={`text-2xl font-semibold tabular-nums ${negative(a.perWeek)}`}>{formatBRL(a.perWeek)}</p>
                  <p className="text-xs text-muted">
                    resto ÷ {a.weeksLeft} {a.weeksLeft === 1 ? "semana" : "semanas"}
                  </p>
                </div>
              </div>

              <dl className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4">
                <Line label="Salário" value={a.salary} sign="+" />
                {a.extraIncome > 0 && <Line label="Receitas extras contabilizadas" value={a.extraIncome} sign="+" />}
                <Line label="Contas fixas do ciclo" value={a.fixedBills} sign="−" />
                <Line label="Faturas que vencem no ciclo" value={a.invoices} sign="−" />
                <Line label="Pix e boletos avulsos" value={a.oneOffExpenses} sign="−" />
                {a.saved !== 0 && <Line label="Guardado na caixinha" value={a.saved} sign="−" />}
              </dl>
            </>
          )}

          <Button variant="ghost" className="mt-3" onClick={() => setEditingSalary(true)} disabled={!salary.data}>
            <Pencil size={14} /> Editar salário
          </Button>
        </Card>
      </div>

      <Card title="Resumo do mês">
        {!m ? (
          <p className="text-sm text-muted">{summary.error ?? "Carregando…"}</p>
        ) : (
          <dl className="flex flex-col gap-2">
            <div className="flex justify-between">
              <dt className="text-muted">Receitas</dt>
              <dd className="tabular-nums">{formatBRL(m.income)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Despesas</dt>
              <dd className="tabular-nums">{formatBRL(m.expenses)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <dt>Saldo</dt>
              <dd className={`tabular-nums ${negative(m.balance)}`}>{formatBRL(m.balance)}</dd>
            </div>
          </dl>
        )}
      </Card>

      {editingSalary && salary.data && (
        <SalaryModal salary={salary.data} onClose={() => setEditingSalary(false)} onChange={onChange} />
      )}
    </div>
  );
}
