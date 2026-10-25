import { useState } from "react";
import { differenceInCalendarDays, format, subDays } from "date-fns";
import { Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useNow } from "@/hooks/useNow";
import { formatBRL } from "@/lib/format";
import { useFinancas } from "../hooks/useFinancas";
import { calcularDisponivel, resumoDoMes } from "../utils/calculos";
import SalarioModal from "./SalarioModal";

function Linha({ rotulo, valor, sinal }: { rotulo: string; valor: number; sinal: "+" | "−" }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted">{rotulo}</dt>
      <dd className="tabular-nums">
        {sinal} {formatBRL(valor)}
      </dd>
    </div>
  );
}

export default function Resumo() {
  const dados = useFinancas();
  const now = useNow();
  const [editandoSalario, setEditandoSalario] = useState(false);

  const d = calcularDisponivel(dados, now);
  const m = resumoDoMes(dados, now);
  const diasRestantes = differenceInCalendarDays(d.ciclo.fim, now);
  const negativo = (v: number) => (v < 0 ? "text-red-400" : "");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Disponível para gastar no ciclo</p>
              <p className={`text-4xl font-semibold tabular-nums ${negativo(d.total)}`}>{formatBRL(d.total)}</p>
              <p className="mt-1 text-sm text-muted">
                Ciclo de {format(d.ciclo.inicio, "dd/MM")} a {format(subDays(d.ciclo.fim, 1), "dd/MM")} ·{" "}
                {diasRestantes} {diasRestantes === 1 ? "dia" : "dias"} restantes
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted">Disponível da semana</p>
              <p className={`text-2xl font-semibold tabular-nums ${negativo(d.porSemana)}`}>
                {formatBRL(d.porSemana)}
              </p>
              <p className="text-xs text-muted">
                resto ÷ {d.semanas} {d.semanas === 1 ? "semana" : "semanas"}
              </p>
            </div>
          </div>

          <dl className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4">
            <Linha rotulo="Salário" valor={d.salario} sinal="+" />
            {d.extras > 0 && <Linha rotulo="Receitas extras contabilizadas" valor={d.extras} sinal="+" />}
            <Linha rotulo="Contas fixas do ciclo" valor={d.contasFixas} sinal="−" />
            <Linha rotulo="Faturas que vencem no ciclo" valor={d.faturas} sinal="−" />
            <Linha rotulo="Pix e boletos avulsos" valor={d.avulsos} sinal="−" />
            {d.guardado !== 0 && <Linha rotulo="Guardado na caixinha" valor={d.guardado} sinal="−" />}
          </dl>

          <Button variant="ghost" className="mt-3" onClick={() => setEditandoSalario(true)}>
            <Pencil size={14} /> Editar salário
          </Button>
        </Card>
      </div>

      <Card title="Resumo do mês">
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-muted">Receitas</dt>
            <dd className="tabular-nums">{formatBRL(m.receitas)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Despesas</dt>
            <dd className="tabular-nums">{formatBRL(m.despesas)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <dt>Saldo</dt>
            <dd className={`tabular-nums ${negativo(m.saldo)}`}>{formatBRL(m.saldo)}</dd>
          </div>
        </dl>
      </Card>

      {editandoSalario && <SalarioModal onClose={() => setEditandoSalario(false)} />}
    </div>
  );
}
