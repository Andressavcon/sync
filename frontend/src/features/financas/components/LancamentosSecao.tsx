import { useState } from "react";
import { format, isAfter, parseISO, endOfDay } from "date-fns";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useNow } from "@/hooks/useNow";
import { formatBRL } from "@/lib/format";
import { useFinancas } from "../hooks/useFinancas";
import { meioRotulo } from "../utils/meio";
import type { Lancamento } from "../types";
import LancamentoModal from "./LancamentoModal";

type Filtro = "todos" | "entradas" | "saidas";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "entradas", rotulo: "Entradas" },
  { id: "saidas", rotulo: "Saídas" },
];

export default function LancamentosSecao() {
  const { lancamentos, cartoes } = useFinancas();
  const now = useNow();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [form, setForm] = useState<Lancamento | "novo" | null>(null);

  // parcelas futuras aparecem na fatura do cartão, não nesta lista
  const lista = lancamentos
    .filter((l) => !isAfter(parseISO(l.data), endOfDay(now)))
    .filter((l) => filtro === "todos" || (filtro === "entradas" ? l.tipo === "receita" : l.tipo === "despesa"))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 40);

  return (
    <Card>
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold">Lançamentos recentes</h2>
        <div className="flex gap-1" role="group" aria-label="Filtro">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={[
                "rounded-full border px-3 py-1 text-sm transition-colors",
                filtro === f.id
                  ? "border-primary bg-primary text-bg"
                  : "border-border text-muted hover:bg-surface-hover hover:text-text",
              ].join(" ")}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
        <Button onClick={() => setForm("novo")}>
          <Plus size={16} /> Novo lançamento
        </Button>
      </header>

      {lista.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nenhum lançamento.</p>
      ) : (
        <ul className="divide-y divide-border">
          {lista.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => setForm(l)}
                className="flex w-full items-center gap-3 py-3 text-left hover:bg-surface-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {l.titulo}
                    {l.parcela && ` — parcela ${l.parcela.numero}/${l.parcela.total}`}
                  </p>
                  <p className="text-xs text-muted">
                    {format(parseISO(l.data), "dd/MM")} · {l.tipo === "receita" ? "Receita" : meioRotulo(l.meio, cartoes)}
                  </p>
                </div>
                <span className={`tabular-nums ${l.tipo === "receita" ? "text-primary" : ""}`}>
                  {l.tipo === "receita" ? "+" : "−"} {formatBRL(l.valor)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {form && <LancamentoModal lancamento={form === "novo" ? undefined : form} onClose={() => setForm(null)} />}
    </Card>
  );
}
