import { useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FormModal from "@/components/ui/FormModal";
import Input from "@/components/ui/Input";
import { useNow } from "@/hooks/useNow";
import { formatBRL } from "@/lib/format";
import { useFinancas } from "../hooks/useFinancas";
import { faturaDe, fechamentoDe, inicioDoMes, mesDe, sugerirFatura, totalFatura, vencimentoDe } from "../utils/faturas";

/** Editor do fechamento; usa key={mes} no pai para reiniciar ao trocar de mês. */
function Fechamento({ cartaoId, mes }: { cartaoId: string; mes: string }) {
  const { cartoes, faturas, confirmarFechamento } = useFinancas();
  const cartao = cartoes.find((c) => c.id === cartaoId)!;
  const fatura = faturaDe(faturas, cartaoId, mes);
  const [data, setData] = useState(format(fechamentoDe(cartao, mes, faturas), "yyyy-MM-dd"));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Fechamento</span>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <Button variant="secondary" disabled={!data} onClick={() => confirmarFechamento(cartaoId, mes, data)}>
          {fatura?.confirmada ? "Atualizar data" : "Confirmar data"}
        </Button>
      </div>
      {!fatura?.confirmada && (
        <p className="flex items-center gap-1.5 text-sm text-primary">
          <AlertTriangle size={14} /> Confira a data de fechamento deste mês e edite se preciso.
        </p>
      )}
    </div>
  );
}

export default function FaturaModal({ cartaoId, onClose }: { cartaoId: string; onClose: () => void }) {
  const { cartoes, faturas, lancamentos, marcarFaturaPaga } = useFinancas();
  const now = useNow();
  const cartao = cartoes.find((c) => c.id === cartaoId);
  const [mes, setMes] = useState(() => (cartao ? sugerirFatura(cartao, now, faturas) : mesDe(now)));

  if (!cartao) return null;

  const fatura = faturaDe(faturas, cartaoId, mes);
  const itens = lancamentos
    .filter(
      (l) =>
        l.tipo === "despesa" && l.meio.tipo === "cartao" && l.meio.cartaoId === cartaoId && l.faturaMes === mes
    )
    .sort((a, b) => a.data.localeCompare(b.data));
  const total = totalFatura(lancamentos, cartaoId, mes);
  const paga = fatura?.paga ?? false;
  const mover = (n: number) => setMes(mesDe(addMonths(inicioDoMes(mes), n)));

  return (
    <FormModal titulo={cartao.nome} onClose={onClose}>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Fatura anterior" onClick={() => mover(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <div className="flex-1 text-center">
          <p className="font-medium capitalize">Fatura de {format(inicioDoMes(mes), "MMMM yyyy", { locale: ptBR })}</p>
          <p className="text-xs text-muted">Vence em {format(vencimentoDe(cartao, mes), "dd/MM/yyyy")}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Próxima fatura" onClick={() => mover(1)}>
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-bg p-3">
        <div>
          <p className="text-sm text-muted">Total da fatura</p>
          <p className="text-2xl font-semibold tabular-nums">{formatBRL(total)}</p>
        </div>
        {paga && <Badge variant="primary">Paga</Badge>}
      </div>

      <Fechamento key={mes} cartaoId={cartaoId} mes={mes} />

      <div>
        <h3 className="mb-2 text-sm font-medium">Lançamentos</h3>
        {itens.length === 0 ? (
          <p className="text-sm text-muted">Nenhum lançamento nesta fatura.</p>
        ) : (
          <ul className="divide-y divide-border">
            {itens.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  {l.titulo}
                  {l.parcela && ` — parcela ${l.parcela.numero}/${l.parcela.total}`}
                  <span className="ml-2 text-xs text-muted">{format(parseISO(l.data), "dd/MM")}</span>
                </span>
                <span className="tabular-nums">{formatBRL(l.valor)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button variant={paga ? "secondary" : "primary"} onClick={() => marcarFaturaPaga(cartaoId, mes, !paga)}>
        {paga ? "Desmarcar como paga" : "Marcar fatura como paga"}
      </Button>
    </FormModal>
  );
}
