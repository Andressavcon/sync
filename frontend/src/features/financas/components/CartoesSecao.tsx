import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useNow } from "@/hooks/useNow";
import { formatBRL } from "@/lib/format";
import { useFinancas } from "../hooks/useFinancas";
import { comprometidoFuturo, faturaDe, sugerirFatura, totalFatura, vencimentoDe } from "../utils/faturas";
import type { Cartao } from "../types";
import CartaoFormModal from "./CartaoFormModal";
import FaturaModal from "./FaturaModal";

export default function CartoesSecao() {
  const { cartoes, faturas, lancamentos, updateCartao, arquivarCartao, removeCartao } = useFinancas();
  const now = useNow();
  const [form, setForm] = useState<Cartao | "novo" | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [verArquivados, setVerArquivados] = useState(false);

  const ativos = cartoes.filter((c) => !c.arquivado);
  const arquivados = cartoes.filter((c) => c.arquivado);

  function excluir(c: Cartao) {
    const temLancamentos = lancamentos.some((l) => l.meio.tipo === "cartao" && l.meio.cartaoId === c.id);
    if (temLancamentos) {
      const ok = window.confirm(
        `"${c.nome}" já tem lançamentos ou parcelas. Arquivar (esconder e manter o histórico) em vez de apagar tudo?`
      );
      if (ok) arquivarCartao(c.id);
    } else if (window.confirm(`Excluir o cartão "${c.nome}"?`)) {
      removeCartao(c.id);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cartões</h2>
        <Button onClick={() => setForm("novo")}>
          <Plus size={16} /> Novo cartão
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ativos.map((c) => {
          const mesAtual = sugerirFatura(c, now, faturas);
          const total = totalFatura(lancamentos, c.id, mesAtual);
          const futuro = comprometidoFuturo(lancamentos, c.id, mesAtual);
          const alerta = !faturaDe(faturas, c.id, mesAtual)?.confirmada;
          return (
            <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start gap-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setAberto(c.id)}>
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    {c.nome}
                    {alerta && (
                      <span title="Conferir a data de fechamento" className="text-primary">
                        <AlertTriangle size={16} />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    Fatura atual · vence em {format(vencimentoDe(c, mesAtual), "dd/MM")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{formatBRL(total)}</p>
                  <p className="mt-1 text-xs text-muted">
                    Comprometido nas faturas futuras: {formatBRL(futuro)}
                  </p>
                </button>
                <Button variant="ghost" size="icon" aria-label="Editar cartão" onClick={() => setForm(c)}>
                  <Pencil size={16} />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Excluir cartão" onClick={() => excluir(c)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {arquivados.length > 0 && (
        <div>
          <Button variant="ghost" onClick={() => setVerArquivados(!verArquivados)}>
            {verArquivados ? "Esconder" : "Ver"} arquivados ({arquivados.length})
          </Button>
          {verArquivados && (
            <ul className="mt-2 flex flex-col gap-2">
              {arquivados.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-muted">{c.nome}</span>
                  <Button variant="secondary" onClick={() => updateCartao(c.id, { arquivado: false })}>
                    Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {form && <CartaoFormModal cartao={form === "novo" ? undefined : form} onClose={() => setForm(null)} />}
      {aberto && <FaturaModal cartaoId={aberto} onClose={() => setAberto(null)} />}
    </div>
  );
}
