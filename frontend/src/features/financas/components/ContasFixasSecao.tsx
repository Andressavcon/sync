import { useState } from "react";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import { formatBRL, parseBRL } from "@/lib/format";
import { useFinancas } from "../hooks/useFinancas";
import { pagaNoMes, valorContaMes, vencimentoConta } from "../utils/contas";
import { inicioDoMes, mesDe } from "../utils/faturas";
import type { ContaFixa } from "../types";
import ContaFormModal from "./ContaFormModal";

export default function ContasFixasSecao() {
  const dados = useFinancas();
  const { contasFixas, alternarPago, definirValorMes, removeContaFixa } = dados;

  const [mes, setMes] = useState(() => mesDe(new Date()));
  const [form, setForm] = useState<ContaFixa | "nova" | null>(null);
  const [editandoValor, setEditandoValor] = useState<string | null>(null);
  const [valorTxt, setValorTxt] = useState("");

  const pendente = contasFixas
    .filter((c) => !pagaNoMes(dados, c.id, mes))
    .reduce((t, c) => t + valorContaMes(dados, c, mes), 0);

  function salvarValor(contaId: string) {
    const v = parseBRL(valorTxt);
    if (Number.isFinite(v) && v >= 0) definirValorMes(contaId, mes, v);
    setEditandoValor(null);
  }

  return (
    <Card>
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold capitalize">
          Contas fixas · {format(inicioDoMes(mes), "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => setMes(mesDe(addMonths(inicioDoMes(mes), -1)))}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Próximo mês"
          onClick={() => setMes(mesDe(addMonths(inicioDoMes(mes), 1)))}
        >
          <ChevronRight size={16} />
        </Button>
        <Button onClick={() => setForm("nova")}>
          <Plus size={16} /> Nova conta
        </Button>
      </header>

      {contasFixas.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Nenhuma conta fixa cadastrada.</p>
      ) : (
        <ul className="divide-y divide-border">
          {contasFixas.map((c) => {
            const pago = pagaNoMes(dados, c.id, mes);
            const valor = valorContaMes(dados, c, mes);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                <Checkbox label={`Marcar ${c.nome} como paga`} checked={pago} onChange={() => alternarPago(c.id, mes)} />
                <div className="min-w-0 flex-1 basis-32">
                  <p className={pago ? "text-muted line-through" : "font-medium"}>{c.nome}</p>
                  <p className="text-xs text-muted">Vence em {format(vencimentoConta(c, mes), "dd/MM")}</p>
                </div>

                {editandoValor === c.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      className="w-28"
                      inputMode="decimal"
                      aria-label="Valor deste mês"
                      value={valorTxt}
                      onChange={(e) => setValorTxt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && salvarValor(c.id)}
                      autoFocus
                    />
                    <Button size="icon" aria-label="Salvar valor" onClick={() => salvarValor(c.id)}>
                      <Check size={16} />
                    </Button>
                    <Button variant="secondary" size="icon" aria-label="Cancelar" onClick={() => setEditandoValor(null)}>
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    title="Editar o valor deste mês"
                    className="tabular-nums hover:text-primary"
                    onClick={() => {
                      setValorTxt(String(valor).replace(".", ","));
                      setEditandoValor(c.id);
                    }}
                  >
                    {formatBRL(valor)}
                  </button>
                )}

                <Button variant="ghost" size="icon" aria-label="Editar conta" onClick={() => setForm(c)}>
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover conta"
                  onClick={() => window.confirm(`Remover "${c.nome}"?`) && removeContaFixa(c.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted">Total pendente este mês</span>
        <span className="font-semibold tabular-nums">{formatBRL(pendente)}</span>
      </p>

      {form && <ContaFormModal conta={form === "nova" ? undefined : form} onClose={() => setForm(null)} />}
    </Card>
  );
}
